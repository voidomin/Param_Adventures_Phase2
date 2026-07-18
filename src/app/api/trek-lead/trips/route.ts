import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

/**
 * GET /api/trek-lead/trips
 * Returns all slots where the logged-in user is an assigned trek lead.
 * Includes current status, trip date, manager info, and booking count.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const userId = auth.userId;

    const assignments = await prisma.tripAssignment.findMany({
      where: { trekLeadId: userId },
      include: {
        slot: {
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
              select: { id: true, name: true, email: true, phoneNumber: true },
            },
            bookings: {
              where: { bookingStatus: "CONFIRMED" },
              select: { participantCount: true },
            },
          },
        },
      },
      orderBy: { slot: { date: "asc" } },
    });

    const trips = assignments.map((a) => {
      const slot = a.slot;
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
    console.error("Trek lead trips fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments." },
      { status: 500 },
    );
  }
}
