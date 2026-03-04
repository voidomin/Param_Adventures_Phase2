import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/trek-lead/trips/[id]/trek-end
 *
 * Trek Lead marks the trek as ended from the field.
 * Body: { trekLeadNote: string }
 *
 * Validations:
 * - Caller must be an assigned trek lead for this slot
 * - Slot must be TREK_STARTED
 *
 * Sets: slot.status = TREK_ENDED, slot.trekEndedAt = now()
 * Saves trek lead's note to TripLog.trekLeadNote
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const { id: slotId } = await params;
    const userId = auth.userId;
    const body = await request.json();
    const trekLeadNote: string = (body.trekLeadNote ?? "").trim();

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
      select: { status: true },
    });

    if (!slot) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }

    if (slot.status !== "TREK_STARTED") {
      return NextResponse.json(
        { error: "Trek must be in TREK_STARTED state to end it." },
        { status: 409 },
      );
    }

    // Update slot status and save trek lead note to TripLog
    const [updated] = await prisma.$transaction([
      prisma.slot.update({
        where: { id: slotId },
        data: {
          status: "TREK_ENDED",
          trekEndedAt: new Date(),
        },
      }),
      prisma.tripLog.upsert({
        where: { slotId },
        create: { slotId, trekLeadNote },
        update: { trekLeadNote },
      }),
    ]);

    await logActivity("TREK_ENDED", auth.userId, "Slot", slotId, {
      trekLeadNote,
    });

    return NextResponse.json({
      success: true,
      status: updated.status,
      trekEndedAt: updated.trekEndedAt,
    });
  } catch (error) {
    console.error("Trek end error:", error);
    return NextResponse.json({ error: "Failed to end trek." }, { status: 500 });
  }
}
