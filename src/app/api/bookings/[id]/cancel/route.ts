import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { sendBookingCancellation } from "@/lib/email";
import { z } from "zod";

const cancelSchema = z.object({
  reason: z.string().optional().or(z.literal("")),
  preference: z.enum(["COUPON", "BANK_REFUND"]),
});

/**
 * POST /api/bookings/[id]/cancel
 * Authenticated user cancels their own booking.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  const { id: bookingId } = await params;
  const userId = auth.userId;

  try {
    const body = await request.json();
    const parsed = cancelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { reason, preference } = parsed.data;

    // Fetch the booking with slot and experience info
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        slot: true,
        experience: { select: { title: true } },
        user: { select: { name: true, email: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
    if (booking.userId !== userId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    if (booking.bookingStatus === "CANCELLED") {
      return NextResponse.json(
        { error: "Booking is already cancelled." },
        { status: 409 }
      );
    }
    if (!["REQUESTED", "CONFIRMED"].includes(booking.bookingStatus)) {
      return NextResponse.json(
        { error: "This booking cannot be cancelled." },
        { status: 409 }
      );
    }

    // Determine refund: only if payment was made
    const newPaymentStatus =
      booking.paymentStatus === "PAID" ? "REFUND_PENDING" : booking.paymentStatus;

    // Atomic transaction: update booking + restore slot capacity
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          bookingStatus: "CANCELLED",
          paymentStatus: newPaymentStatus,
          cancelledAt: new Date(),
          cancelledByUserId: userId,
          cancellationReason: reason || null,
          refundPreference: preference,
        },
      });

      if (booking.slotId) {
        await tx.slot.update({
          where: { id: booking.slotId },
          data: {
            remainingCapacity: { increment: booking.participantCount },
          },
        });
      }
    });

    // Audit log
    await logActivity("BOOKING_CANCELLED", userId, "Booking", bookingId, {
      preference,
      reason: reason || "No reason provided",
      participantCount: booking.participantCount,
    });

    // Send cancellation email
    await sendBookingCancellation({
      userName: booking.user.name || "Adventurer",
      userEmail: booking.user.email,
      experienceTitle: booking.experience.title,
      slotDate: booking.slot?.date?.toISOString() ?? new Date().toISOString(),
      refundPreference: preference,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Booking cancellation error:", error);
    return NextResponse.json(
      { error: "Failed to cancel booking." },
      { status: 500 }
    );
  }
}
