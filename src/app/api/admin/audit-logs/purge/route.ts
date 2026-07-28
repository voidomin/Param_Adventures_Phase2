import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

const DEFAULT_RETENTION_DAYS = 365;

function isValidCronSecret(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  return providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf);
}

/**
 * POST /api/admin/audit-logs/purge
 *
 * Deletes AuditLog rows older than the retention window. AuditLog has no
 * TTL today -- rows accumulate forever, which conflicts with DPDP's
 * purpose-limitation principle (audit entries only need to exist long
 * enough to investigate an incident or dispute, not indefinitely).
 * Retention defaults to 365 days; override via the AUDIT_LOG_RETENTION_DAYS
 * env var if a shorter/longer window is ever needed.
 *
 * Auth: Requires "system:config" permission, OR a valid x-cron-secret
 * header for the scheduled job.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "system:config");

  if (!auth.authorized) {
    const cronSecret = request.headers.get("x-cron-secret");
    if (!isValidCronSecret(cronSecret, process.env.CRON_SECRET)) {
      return auth.response;
    }
  }

  try {
    const retentionDays = Number(process.env.AUDIT_LOG_RETENTION_DAYS) || DEFAULT_RETENTION_DAYS;
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const { count } = await prisma.auditLog.deleteMany({
      where: { timestamp: { lt: cutoff } },
    });

    return NextResponse.json({
      message: `Purged ${count} audit log entr${count === 1 ? "y" : "ies"} older than ${retentionDays} days.`,
      count,
    });
  } catch (error) {
    console.error("Audit log purge error:", error);
    return NextResponse.json(
      { error: "Failed to purge audit logs." },
      { status: 500 },
    );
  }
}
