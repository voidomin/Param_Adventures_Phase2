import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

/**
 * GET /api/manager/trips
 * Returns all upcoming slots assigned to the currently logged-in Trip Manager.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "ops:view-all-trips");
  if (!auth.authorized) return auth.response;

  try {
    const userId = auth.userId;

    const slots = await prisma.slot.findMany({
      where: {
        managerId: userId,
        status: { not: "COMPLETED" },
      },
      orderBy: { date: "asc" },
      include: {
        experience: {
          select: {
            id: true,
            title: true,
            location: true,
            durationDays: true,
            images: true,
          },
        },
        manager: {
          select: { id: true, name: true, email: true },
        },
        assignments: {
          include: {
            trekLead: { select: { id: true, name: true, email: true } },
          },
        },
        bookings: {
          where: { bookingStatus: "CONFIRMED" },
          select: { participantCount: true },
        },
      },
    });

    const trips = slots.map((slot) => {
      const confirmedParticipants = slot.bookings.reduce(
        (sum, booking) => sum + booking.participantCount,
        0,
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { bookings: _bookings, ...slotInfo } = slot;
      return {
        ...slotInfo,
        _count: {
          bookings: confirmedParticipants,
        },
      };
    });

    return NextResponse.json({ trips });
  } catch (error) {
    console.error("Manager trips fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch assigned trips." },
      { status: 500 },
    );
  }
}
