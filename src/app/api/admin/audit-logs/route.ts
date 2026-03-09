import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

/**
 * GET /api/admin/audit-logs — SUPER_ADMIN only.
 *
 * Query params:
 *   - page    (default: 1)
 *   - limit   (default: 25, max: 100)
 *   - action  (optional, filter by action type e.g. "ROLE_ASSIGNED")
 *   - search  (optional, search in targetType / targetId / metadata)
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
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10),
    );
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get("limit") || "25", 10)),
    );
    const action = searchParams.get("action") || undefined;
    const search = searchParams.get("search") || undefined;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (action) {
      where.action = action;
    }

    if (search) {
      where.OR = [
        { targetType: { contains: search, mode: "insensitive" } },
        { targetId: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
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
