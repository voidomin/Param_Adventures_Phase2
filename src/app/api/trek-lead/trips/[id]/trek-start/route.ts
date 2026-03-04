import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { isSlotDayToday } from "@/lib/ist-utils";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/trek-lead/trips/[id]/trek-start
 *
 * Trek Lead starts the trek on-site.
 * Strict validations:
 * - Caller must be an assigned trek lead for this slot
 * - Slot must be ACTIVE (manager already started the trip)
 * - Today's IST date must equal the slot's IST date (D-Day lock)
 *
 * Sets: slot.status = TREK_STARTED, slot.trekStartedAt = now()
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const { id: slotId } = await params;
    const userId = auth.userId;

    // Must be assigned to this slot
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
      select: {
        id: true,
        date: true,
        status: true,
      },
    });

    if (!slot) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }

    // Slot must be ACTIVE (manager must have started it first)
    if (slot.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error:
            slot.status === "UPCOMING"
              ? "The Trip Manager has not started this trip yet."
              : `Trek is already ${slot.status.replace("_", " ").toLowerCase()}.`,
        },
        { status: 409 },
      );
    }

    // 🔒 IST D-Day lock — must be the exact trip date in IST
    if (!isSlotDayToday(slot.date)) {
      return NextResponse.json(
        {
          error:
            "Trek can only be started on the day of the trip (IST). Please try again on the trip date.",
        },
        { status: 403 },
      );
    }

    const updated = await prisma.slot.update({
      where: { id: slotId },
      data: {
        status: "TREK_STARTED",
        trekStartedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      status: updated.status,
      trekStartedAt: updated.trekStartedAt,
    });
  } catch (error) {
    console.error("Trek start error:", error);
    return NextResponse.json(
      { error: "Failed to start trek." },
      { status: 500 },
    );
  }
}
