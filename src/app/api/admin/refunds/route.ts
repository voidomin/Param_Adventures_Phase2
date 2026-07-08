import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

/**
 * GET /api/admin/refunds
 * List all refund requests with customer and booking relations (admin only)
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "booking:view-all");
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const whereClause: Record<string, unknown> = {};
    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    const refunds = await prisma.refundRequest.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
        booking: {
          include: {
            experience: {
              select: {
                title: true,
                slug: true,
              },
            },
            slot: {
              select: {
                date: true,
              },
            },
          },
        },
      },
      orderBy: {
        requestedAt: "desc",
      },
    });

    return NextResponse.json({ refunds });

  } catch (error) {
    console.error("Admin list refunds error:", error);
    return NextResponse.json({ error: "Failed to list refund requests." }, { status: 500 });
  }
}
