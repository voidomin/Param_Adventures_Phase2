import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

/**
 * GET /api/admin/trips
 * Trip Manager / Admin view of all upcoming trips (Slots).
 * Returns slots including experience details, participant count, and assigned Trek Leads.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "trip:moderate");
  if (!auth.authorized) return auth.response;

  try {
    const upcomingSlots = await prisma.slot.findMany({
      where: {
        date: { gte: new Date() },
      },
      orderBy: { date: "asc" },
      include: {
        experience: {
          select: {
            title: true,
            location: true,
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
        _count: {
          select: {
            bookings: {
              where: {
                bookingStatus: "CONFIRMED",
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ trips: upcomingSlots });
  } catch (error) {
    console.error("Fetch upcoming trips error:", error);
    return NextResponse.json(
      { error: "Failed to fetch upcoming trips." },
      { status: 500 },
    );
  }
}
