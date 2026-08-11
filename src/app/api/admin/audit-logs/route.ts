import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { Prisma } from "@prisma/client";
import { logActivity } from "@/lib/audit-logger";

/**
 * GET /api/admin/audit-logs — SUPER_ADMIN only.
 *
 * Query params:
 *   - page      (default: 1)
 *   - limit     (default: 25, max: 100)
 *   - action    (optional, filter by action type e.g. "ROLE_ASSIGNED")
 *   - search    (optional, search in targetType / targetId / metadata)
 *   - actorId   (optional, filter to a specific actor's User ID)
 *   - startDate (optional, ISO date string, inclusive lower bound on timestamp)
 *   - endDate   (optional, ISO date string, inclusive upper bound on timestamp)
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  if (auth.roleName !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Unauthorized: SUPER_ADMIN only." },
      { status: 403 },
    );
  }

  try {
    const { searchParams } = request.nextUrl;
    const download = searchParams.get("download") === "true";
    const action = searchParams.get("action") || undefined;
    const search = searchParams.get("search") || undefined;
    const targetTypeRaw = searchParams.get("targetType") || undefined;
    const actorId = searchParams.get("actorId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    // Build where clause
    const where: Prisma.AuditLogWhereInput = {};

    if (action) {
      where.action = action;
    }

    if (targetTypeRaw) {
      const targetTypes = targetTypeRaw.split(",");
      where.targetType = { in: targetTypes };
    }

    if (actorId) {
      where.actorId = actorId;
    }

    if (startDate || endDate) {
      where.timestamp = {
        ...(startDate && { gte: new Date(startDate) }),
        // Treat endDate as inclusive of the whole day, not just midnight.
        ...(endDate && { lte: new Date(`${endDate}T23:59:59.999Z`) }),
      };
    }

    if (search) {
      where.OR = [
        { targetType: { contains: search, mode: "insensitive" } },
        { targetId: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
      ];
    }

    const actorSelect = { actor: { select: { id: true, name: true, email: true } } };

    if (download) {
      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        include: actorSelect,
      });

      // Downloading the audit trail is itself a sensitive action -- it can
      // include other users' names/emails via the actor relation -- so it
      // gets its own trail entry: who exported, which filters, how many
      // rows. Not the exported content itself, just the fact it happened.
      await logActivity("AUDIT_LOG_EXPORTED", auth.userId, "AuditLog", null, {
        targetType: targetTypeRaw,
        action,
        actorId,
        startDate,
        endDate,
        rowCount: logs.length,
      });

      return NextResponse.json({ logs });
    }

    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10),
    );
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get("limit") || "25", 10)),
    );
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
        include: actorSelect,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Audit logs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs." },
      { status: 500 },
    );
  }
}
