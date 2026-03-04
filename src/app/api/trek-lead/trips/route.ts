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
            _count: {
              select: {
                bookings: { where: { bookingStatus: "CONFIRMED" } },
              },
            },
          },
        },
      },
      orderBy: { slot: { date: "asc" } },
    });

    const trips = assignments.map((a) => a.slot);

    return NextResponse.json({ trips });
  } catch (error) {
    console.error("Trek lead trips fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments." },
      { status: 500 },
    );
  }
}
