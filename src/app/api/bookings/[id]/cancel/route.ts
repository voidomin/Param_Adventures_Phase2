import { NextRequest, NextResponse } from "next/server";
import { prisma, runWithRetry } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { sendBookingCancellation } from "@/lib/email";
import { z } from "zod";
import { getRefundPercentage, calculateRefundBreakdown } from "@/lib/refund-engine";
import { logError } from "@/lib/monitoring";

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
    if (booking.slot) {
      if (["TREK_STARTED", "TREK_ENDED", "COMPLETED"].includes(booking.slot.status)) {
        return NextResponse.json(
          { error: "Cannot cancel a booking for a trip that has already started or completed." },
          { status: 400 }
        );
      }
      const departureDate = new Date(booking.slot.date);
      if (departureDate.getTime() <= Date.now()) {
        return NextResponse.json(
          { error: "Cannot cancel a booking on or after the departure date." },
          { status: 400 }
        );
      }
    }

    // Determine refund: only if payment was made (fully or partially)
    const newPaymentStatus =
      (booking.paymentStatus === "PAID" || booking.paymentStatus === "PARTIALLY_PAID")
        ? "REFUND_PENDING"
        : booking.paymentStatus;

    // Resolve cancellation policy based on departure date
    const departureDate = booking.slot ? new Date(booking.slot.date) : new Date();
    const { refundPercent } = await getRefundPercentage(departureDate, new Date());

    // Net out any refund already issued by an earlier partial cancellation
    // on this booking (via /cancel-participants) -- booking.refundAmount is
    // a running total and paidAmount is never reduced when that happens, so
    // computing straight from paidAmount here would recompute a refund
    // against money that was already handed back, double-counting it.
    const alreadyRefunded = Number(booking.refundAmount || 0);
    const effectivePaidAmount = Math.max(0, Number(booking.paidAmount) - alreadyRefunded);

    const breakdown = calculateRefundBreakdown({
      baseFare: Number(booking.baseFare),
      totalPrice: Number(booking.totalPrice),
      paidAmount: effectivePaidAmount,
      paymentType: booking.paymentType as "FULL" | "ADVANCE",
      refundPercent,
      taxBreakdown: booking.taxBreakdown,
      refundPreference: preference,
    });

    const finalRefund = breakdown.finalRefundAmount;
    const totalRefundAmount = alreadyRefunded + finalRefund;

    // Atomic transaction: update booking + restore slot capacity + create refund request
    await runWithRetry(() =>
      prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            bookingStatus: "CANCELLED",
            paymentStatus: newPaymentStatus,
            cancelledAt: new Date(),
            cancelledByUserId: userId,
            cancellationReason: reason || null,
            refundPreference: preference,
            refundAmount: totalRefundAmount > 0 ? totalRefundAmount : null,
          },
        });

        // Capacity is reserved from the moment a booking is created
        // (REQUESTED), not just once CONFIRMED -- see processBooking in
        // booking.service.ts. The status check at the top of this handler
        // already guarantees bookingStatus is REQUESTED or CONFIRMED here
        // (anything else was rejected earlier), so both cases hold a
        // reservation that needs to be given back.
        if (booking.slotId) {
          await tx.slot.update({
            where: { id: booking.slotId },
            data: {
              remainingCapacity: { increment: booking.participantCount },
            },
          });
        }

        if (newPaymentStatus === "REFUND_PENDING" && finalRefund > 0) {
          await tx.refundRequest.create({
            data: {
              bookingId,
              customerId: booking.userId,
              refundMethod: preference === "COUPON" ? "TRAVEL_COUPON" : "BANK_TRANSFER",
              baseFare: breakdown.baseFare,
              gst: breakdown.gst,
              convenienceFee: breakdown.convenienceFee,
              cancellationPercent: breakdown.cancellationPercent,
              cancellationCharges: breakdown.cancellationCharges,
              finalRefundAmount: breakdown.finalRefundAmount,
              status: "REQUESTED",
            },
          });
        }
      })
    );

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
    await logError(error instanceof Error ? error : new Error(String(error)), {
      route: "POST /api/bookings/[id]/cancel",
      requestId: request.headers?.get("x-request-id"),
    });
    return NextResponse.json(
      { error: "Failed to cancel booking." },
      { status: 500 }
    );
  }
}
