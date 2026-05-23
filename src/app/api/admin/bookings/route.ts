import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

/**
 * GET /api/admin/bookings — List all bookings (admin)
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "booking:view-all");
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const experienceId = searchParams.get("experienceId");
    
    // Pagination params
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const whereClause = {
      ...(status
        ? { bookingStatus: status as "REQUESTED" | "CONFIRMED" | "CANCELLED" }
        : {}),
      ...(experienceId ? { experienceId } : {}),
      deletedAt: null,
    };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          participants: true,
          user: {
            select: { id: true, name: true, email: true, phoneNumber: true },
          },
          experience: { select: { id: true, title: true, slug: true } },
          slot: { select: { id: true, date: true } },
          payments: {
            select: { status: true, amount: true, providerPaymentId: true },
          },
        },
      }),
      prisma.booking.count({ where: whereClause })
    ]);

    return NextResponse.json({ 
      bookings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings." },
      { status: 500 },
    );
  }
}
