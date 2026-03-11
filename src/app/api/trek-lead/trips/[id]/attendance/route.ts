import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { isSlotDayToday } from "@/lib/ist-utils";
import { z } from "zod";

const attendanceSchema = z.object({
  attendees: z.array(
    z.object({
      participantId: z.string().min(1),
      attended: z.boolean(),
    })
  ).min(1, "At least one participant must be provided."),
});

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/trek-lead/trips/[id]/attendance
 *
 * Trek Lead marks attendance for all confirmed bookings.
 * Body: { attendees: [{ bookingId: string, attended: boolean }] }
 *
 * Validations:
 * - Caller must be an assigned trek lead for this slot
 * - Slot must be in ACTIVE or TREK_STARTED state
 * - Today's IST date must equal the slot's IST date (D-Day lock)
 *
 * Upserts the TripLog.attendees JSON and sets Booking.attended flag.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const { id: slotId } = await params;
    const userId = auth.userId;
    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = attendanceSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { attendees } = parseResult.data;

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
      select: { date: true, status: true },
    });

    if (!slot) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }

    // Must be ACTIVE or TREK_STARTED
    if (!["ACTIVE", "TREK_STARTED"].includes(slot.status)) {
      return NextResponse.json(
        { error: "Attendance can only be marked on a started trip." },
        { status: 409 },
      );
    }

    // 🔒 IST D-Day lock
    if (!isSlotDayToday(slot.date)) {
      return NextResponse.json(
        {
          error: "Attendance can only be marked on the day of the trip (IST).",
        },
        { status: 403 },
      );
    }

    // Upsert TripLog with attendance data
    await prisma.tripLog.upsert({
      where: { slotId },
      create: { slotId, attendees },
      update: { attendees },
    });

    // Update BookingParticipant.attended flag for each entry
    await Promise.all(
      attendees.map(({ participantId, attended }) =>
        prisma.bookingParticipant.update({
          where: { id: participantId },
          data: { attended },
        }),
      ),
    );

    return NextResponse.json({ success: true, count: attendees.length });
  } catch (error) {
    console.error("Attendance mark error:", error);
    return NextResponse.json(
      { error: "Failed to save attendance." },
      { status: 500 },
    );
  }
}
