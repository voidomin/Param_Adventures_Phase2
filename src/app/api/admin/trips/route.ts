import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

/**
 * GET /api/admin/trips
 * Trip Manager / Admin view of all upcoming trips (Slots).
 * Returns slots including experience details, participant count, and assigned Trek Leads.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, [
    "ops:view-all-trips",
    "trip:create",
  ]);
  if (!auth.authorized) return auth.response;

  try {
    const showPast = request.url ? new URL(request.url).searchParams.get("past") === "true" : false;

    // Upcoming trips are naturally self-limiting (bounded by how far ahead
    // trips get scheduled); the historical ?past=true view has no such
    // bound and grows for the life of the business, so it gets a safety cap.
    // This is a cap, not real pagination -- the admin trips list has no
    // paging UI yet.
    const upcomingSlots = await prisma.slot.findMany({
      where: showPast
        ? { date: { lt: new Date() } }
        : { date: { gte: new Date() } },
      orderBy: { date: showPast ? "desc" : "asc" },
      take: showPast ? 500 : undefined,
      include: {
        experience: {
          select: {
            title: true,
            location: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignments: {
          include: {
            trekLead: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        bookings: {
          where: {
            bookingStatus: "CONFIRMED",
          },
          select: {
            participantCount: true,
          },
        },
      },
    });

    const transformedSlots = upcomingSlots.map((slot) => {
      const confirmedParticipants = slot.bookings.reduce(
        (sum, booking) => sum + booking.participantCount,
        0,
      );
      
      // Remove the full bookings array to keep the payload clean if not needed
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { bookings, ...slotInfo } = slot;
      return {
        ...slotInfo,
        confirmedParticipants,
      };
    });

    return NextResponse.json({ trips: transformedSlots });
  } catch (error) {
    console.error("Fetch upcoming trips error:", error);
    return NextResponse.json(
      { error: "Failed to fetch upcoming trips." },
      { status: 500 },
    );
  }
}
