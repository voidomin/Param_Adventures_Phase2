import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { isSlotDayToday, todayInIST, dateInIST } from "@/lib/ist-utils";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/trek-lead/trips/[id]
 * Returns full slot detail for a trek lead's assigned trip:
 * experience, manager info, bookings (customer list), and trip log.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const { id: slotId } = await params;
    const userId = auth.userId;

    // Verify trek lead is assigned to this slot
    const assignment = await prisma.tripAssignment.findUnique({
      where: { slotId_trekLeadId: { slotId, trekLeadId: userId } },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned to this trip." },
        { status: 403 },
      );
    }

    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      include: {
        experience: {
          select: {
            title: true,
            location: true,
            durationDays: true,
            difficulty: true,
            images: true,
          },
        },
        manager: {
          select: { id: true, name: true, email: true, phoneNumber: true },
        },
        assignments: {
          include: {
            trekLead: { select: { id: true, name: true, email: true } },
          },
        },
        bookings: {
          where: { bookingStatus: "CONFIRMED", deletedAt: null },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        tripLog: true,
      },
    });

    if (!slot) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }

    // Compute whether trek lead is allowed to perform D-Day actions
    const isDDay = isSlotDayToday(slot.date);
    const slotDateIST = dateInIST(slot.date);
    const currentDateIST = todayInIST();

    return NextResponse.json({ slot, isDDay, slotDateIST, currentDateIST });
  } catch (error) {
    console.error("Trek lead trip detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trip details." },
      { status: 500 },
    );
  }
}
