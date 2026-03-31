import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeSystemRequest } from "@/lib/api-auth";

/**
 * GET /api/admin/settings/system/audit
 * Fetches the most recent platform configuration audit logs.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeSystemRequest(request);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = 20; // Fast initial batch size

  try {
    // Fetch logs with cursor pagination
    const logs = await (prisma.auditLog.findMany as any)({
      where: {
        targetType: "SYSTEM",
      },
      include: {
        actor: {
          select: {
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      take: limit + 1, // Take extra to determine next cursor
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, limit) : logs;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return NextResponse.json({ 
      logs: items, 
      nextCursor,
      hasMore 
    });
  } catch (error) {
    console.error("Fetch system audit logs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit records." },
      { status: 500 },
    );
  }
}
