import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { Prisma } from "@prisma/client";

function buildDateRangeFilter(startParam: string | null, endParam: string | null): { gte?: Date; lte?: Date } {
  const filter: { gte?: Date; lte?: Date } = {};
  if (startParam) {
    filter.gte = new Date(startParam);
  }
  if (endParam) {
    const end = new Date(endParam);
    end.setHours(23, 59, 59, 999);
    filter.lte = end;
  }
  return filter;
}

/**
 * Decides whether to scope the query by an explicit slot-date range, the
 * archived/active slot condition, or (default) active-only bookings including
 * ones with no slot at all.
 */
function buildSlotWhereClause(
  archived: boolean,
  slotDateFilter: { gte?: Date; lte?: Date },
  archiveCondition: Prisma.SlotWhereInput,
  activeCondition: Prisma.SlotWhereInput,
): Pick<Prisma.BookingWhereInput, "slot" | "OR"> {
  const hasSlotDateFilter = Object.keys(slotDateFilter).length > 0;

  if (archived) {
    return {
      slot: {
        ...archiveCondition,
        ...(hasSlotDateFilter ? { date: slotDateFilter } : {}),
      },
    };
  }

  if (hasSlotDateFilter) {
    return {
      slot: {
        ...activeCondition,
        date: slotDateFilter,
      },
    };
  }

  return {
    OR: [
      { slotId: null },
      { slot: activeCondition },
    ],
  };
}

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

    const bookingDateFilter = buildDateRangeFilter(bookingDateStart, bookingDateEnd);
    const slotDateFilter = buildDateRangeFilter(slotDateStart, slotDateEnd);

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

    Object.assign(
      whereClause,
      buildSlotWhereClause(archived, slotDateFilter, archiveCondition, activeCondition),
    );

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
