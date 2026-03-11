import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { sendTripCompletedEmail } from "@/lib/email";
import { z } from "zod";

const tripCompleteSchema = z.object({
  managerNote: z.string().max(2000, "Note is too long").optional().nullable(),
});

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/manager/trips/[id]/complete
 *
 * Manager approves the trip completion after reviewing the trek lead's note.
 * Body: { managerNote?: string }
 *
 * Validations:
 * - Caller must be the assigned manager OR Admin/Super Admin
 * - Slot must be TREK_ENDED
 *
 * Sets: slot.status = COMPLETED, slot.completedAt = now()
 * Sets: Booking.canReview = true for all attended participants
 * Saves manager note to TripLog.managerNote
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const { id: slotId } = await params;
    const userId = auth.userId;
    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = tripCompleteSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const managerNote = parseResult.data.managerNote?.trim() || "";

    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      select: { managerId: true, status: true },
    });

    if (!slot) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }

    // Authorization: assigned manager or admin
    const caller = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { name: true } } },
    });

    const isAdminOrAbove = ["ADMIN", "SUPER_ADMIN"].includes(
      caller?.role.name ?? "",
    );
    if (slot.managerId !== userId && !isAdminOrAbove) {
      return NextResponse.json(
        { error: "Only the assigned manager can complete this trip." },
        { status: 403 },
      );
    }

    if (slot.status !== "TREK_ENDED") {
      return NextResponse.json(
        { error: "Trip must be in TREK_ENDED state to complete it." },
        { status: 409 },
      );
    }

    // Run completion in a transaction
    await prisma.$transaction([
      // Mark slot as COMPLETED
      prisma.slot.update({
        where: { id: slotId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      }),
      // Save manager note
      prisma.tripLog.upsert({
        where: { slotId },
        create: { slotId, managerNote },
        update: { managerNote },
      }),
      // Enable reviews for all attended bookings
      prisma.booking.updateMany({
        where: {
          slotId,
          attended: true,
          bookingStatus: "CONFIRMED",
        },
        data: { canReview: true },
      }),
    ]);

    await logActivity("TRIP_COMPLETED", auth.userId, "Slot", slotId, {
      managerNote: managerNote || null,
    });

    // Fetch attended bookings to send completion emails
    const attendedBookings = await prisma.booking.findMany({
      where: {
        slotId,
        attended: true,
        bookingStatus: "CONFIRMED",
      },
      include: {
        user: { select: { name: true, email: true } },
        experience: { select: { title: true, slug: true } },
      },
    });

    // Fire and forget emails
    Promise.allSettled(
      attendedBookings.map((b) =>
        sendTripCompletedEmail({
          userName: b.user.name || "Adventurer",
          userEmail: b.user.email,
          experienceTitle: b.experience.title,
          experienceSlug: b.experience.slug,
        }),
      ),
    ).catch(console.error);

    return NextResponse.json({ success: true, status: "COMPLETED" });
  } catch (error) {
    console.error("Complete trip error:", error);
    return NextResponse.json(
      { error: "Failed to complete trip." },
      { status: 500 },
    );
  }
}
