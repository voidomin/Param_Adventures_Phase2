import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

/**
 * GET /api/manager/trips
 * Returns all upcoming slots assigned to the currently logged-in Trip Manager.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const userId = auth.userId;

    const trips = await prisma.slot.findMany({
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
        _count: {
          select: {
            bookings: { where: { bookingStatus: "CONFIRMED" } },
          },
        },
      },
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
