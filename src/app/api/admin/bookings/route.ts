import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { Prisma } from "@prisma/client";

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

    const bookingDateStart = searchParams.get("bookingDateStart");
    const bookingDateEnd = searchParams.get("bookingDateEnd");
    const slotDateStart = searchParams.get("slotDateStart");
    const slotDateEnd = searchParams.get("slotDateEnd");
    const archived = searchParams.get("archived") === "true";

    const bookingDateFilter: { gte?: Date; lte?: Date } = {};
    if (bookingDateStart) {
      bookingDateFilter.gte = new Date(bookingDateStart);
    }
    if (bookingDateEnd) {
      const end = new Date(bookingDateEnd);
      end.setHours(23, 59, 59, 999);
      bookingDateFilter.lte = end;
    }

    const slotDateFilter: { gte?: Date; lte?: Date } = {};
    if (slotDateStart) {
      slotDateFilter.gte = new Date(slotDateStart);
    }
    if (slotDateEnd) {
      const end = new Date(slotDateEnd);
      end.setHours(23, 59, 59, 999);
      slotDateFilter.lte = end;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fortyDaysAgo = new Date();
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);

    const archiveCondition = {
      OR: [
        { completedAt: { lt: thirtyDaysAgo } },
        { trekEndedAt: { lt: thirtyDaysAgo } },
        {
          AND: [
            { completedAt: null },
            { trekEndedAt: null },
            { date: { lt: fortyDaysAgo } }
          ]
        }
      ]
    };

    const activeCondition = {
      OR: [
        { completedAt: { gte: thirtyDaysAgo } },
        { trekEndedAt: { gte: thirtyDaysAgo } },
        {
          AND: [
            { completedAt: null },
            { trekEndedAt: null },
            { date: { gte: fortyDaysAgo } }
          ]
        }
      ]
    };

    const whereClause: Prisma.BookingWhereInput = {
      ...(status
        ? { bookingStatus: status as "REQUESTED" | "CONFIRMED" | "CANCELLED" }
        : {}),
      ...(experienceId ? { experienceId } : {}),
      deletedAt: null,
    };

    if (Object.keys(bookingDateFilter).length > 0) {
      whereClause.createdAt = bookingDateFilter;
    }

    if (archived) {
      whereClause.slot = {
        ...archiveCondition,
        ...(Object.keys(slotDateFilter).length > 0 ? { date: slotDateFilter } : {}),
      };
    } else if (Object.keys(slotDateFilter).length > 0) {
      whereClause.slot = {
        ...activeCondition,
        date: slotDateFilter,
      };
    } else {
      whereClause.OR = [
        { slotId: null },
        {
          slot: activeCondition,
        },
      ];
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: whereClause,
        orderBy: { updatedAt: "desc" },
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
            select: { id: true, status: true, amount: true, providerPaymentId: true, provider: true, fullPayload: true, createdAt: true },
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
