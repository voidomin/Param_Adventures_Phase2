import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma, runWithRetry } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { sendBookingCancellation } from "@/lib/email";
import { z } from "zod";
import { getRefundPercentage, calculateRefundBreakdown, createRefundRequestForBreakdown } from "@/lib/refund-engine";
import { restoreCouponsForBooking } from "@/lib/coupon-engine";
import { logError } from "@/lib/monitoring";

const cancelSchema = z.object({
  reason: z.string().optional().or(z.literal("")),
  preference: z.enum(["COUPON", "BANK_REFUND"]),
});

// A booking can only ever have one unresolved RefundRequest at a time
// (RefundRequest.bookingId is @unique) -- if this booking already has one
// pending admin review from an earlier cancellation, a second cancellation
// attempt hits that constraint. Detected here so it can surface as a clear
// 409 instead of an unhandled 500.
function isDuplicateRefundRequestError(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") {
    return false;
  }
  // Shape of `meta` differs by Prisma driver: the classic engine puts a
  // flat `target` array/string on it, while the @prisma/adapter-pg driver
  // used here nests it under meta.driverAdapterError.cause.constraint.fields
  // instead. Scanning the serialized meta (plus the message, as a last
  // resort) for the column name is robust to both.
  const haystack = JSON.stringify(err.meta ?? {}) + err.message;
  return haystack.includes("bookingId");
}

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
        experience: { select: { title: true, cancellationPolicyGroup: true } },
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

    // The whole read-validate-write sequence runs inside one transaction,
    // re-reading the booking's financial fields fresh rather than trusting
    // the snapshot fetched before this call -- a concurrent cancellation
    // (another tab, or a second request racing this one) would otherwise
    // compute the refund off a stale paidAmount, and could leave the
    // booking's paymentStatus permanently stuck at REFUND_PENDING with no
    // RefundRequest ever created for it (see the finalRefund > 0 gate below).
    let finalRefund = 0;
    try {
      finalRefund = await runWithRetry(() =>
        prisma.$transaction(async (tx) => {
          const current = await tx.booking.findUnique({
            where: { id: bookingId },
            select: {
              bookingStatus: true,
              paymentStatus: true,
              paidAmount: true,
              refundAmount: true,
              baseFare: true,
              totalPrice: true,
              taxBreakdown: true,
              paymentType: true,
            },
          });
          if (!current || current.bookingStatus === "CANCELLED") {
            throw new Error("Booking is already cancelled.");
          }

          // Resolve cancellation policy based on departure date. The
          // experience's trek-length group doesn't depend on the booking's
          // financial fields, so it's safe to use the pre-transaction
          // snapshot for it.
          const departureDate = booking.slot ? new Date(booking.slot.date) : new Date();
          const { refundPercent } = await getRefundPercentage(departureDate, new Date(), booking.experience.cancellationPolicyGroup);

          // Net out any refund already issued by an earlier partial
          // cancellation on this booking (via /cancel-participants) --
          // refundAmount is a running total and paidAmount is never reduced
          // when that happens, so computing straight from paidAmount here
          // would recompute a refund against money already handed back,
          // double-counting it.
          const alreadyRefunded = Number(current.refundAmount || 0);
          const effectivePaidAmount = Math.max(0, Number(current.paidAmount) - alreadyRefunded);

          const breakdown = calculateRefundBreakdown({
            baseFare: Number(current.baseFare),
            totalPrice: Number(current.totalPrice),
            paidAmount: effectivePaidAmount,
            paymentType: current.paymentType as "FULL" | "ADVANCE",
            refundPercent,
            taxBreakdown: current.taxBreakdown,
            refundPreference: preference,
          });

          const finalRefund = breakdown.finalRefundAmount;
          const totalRefundAmount = alreadyRefunded + finalRefund;

          // Only move to REFUND_PENDING when there's actually something to
          // refund -- otherwise (e.g. a last-minute 0%-tier cancellation)
          // the booking would be stuck showing "Refund Pending" forever,
          // since no RefundRequest gets created below to ever resolve it.
          const newPaymentStatus =
            (current.paymentStatus === "PAID" || current.paymentStatus === "PARTIALLY_PAID") && finalRefund > 0
              ? "REFUND_PENDING"
              : current.paymentStatus;

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

          // Preview how much (if anything) would be restored to a
          // previously-redeemed coupon on this booking -- restoring it is
          // gated behind the same admin approval as the cash refund (see
          // couponRestoreAmount below), rather than happening automatically.
          // This booking never had automatic coupon restoration wired up at
          // all before, so this also fixes that gap: previously, a customer
          // who used a coupon and cancelled their whole booking through this
          // route never got the coupon's value back either way.
          const { totalRestored: couponRestorePreview } = await restoreCouponsForBooking({
            bookingId,
            cancellationCharges: Number(breakdown.cancellationCharges),
            tx,
            dryRun: true,
          });

          if (finalRefund > 0 || couponRestorePreview > 0) {
            try {
              await createRefundRequestForBreakdown(tx, {
                bookingId,
                customerId: booking.userId,
                preference,
                breakdown,
                couponRestoreAmount: couponRestorePreview,
              });
            } catch (err) {
              if (isDuplicateRefundRequestError(err)) {
                throw new Error("REFUND_ALREADY_PENDING");
              }
              throw err;
            }
          }

          return finalRefund;
        })
      );
    } catch (err) {
      if (err instanceof Error && err.message === "REFUND_ALREADY_PENDING") {
        return NextResponse.json(
          { error: "This booking already has a refund pending admin review. Please wait for it to be resolved before cancelling further." },
          { status: 409 }
        );
      }
      if (err instanceof Error && err.message === "Booking is already cancelled.") {
        return NextResponse.json({ error: err.message }, { status: 409 });
      }
      throw err;
    }

    // Audit log
    await logActivity("BOOKING_CANCELLED", userId, "Booking", bookingId, {
      preference,
      reason: reason || "No reason provided",
      participantCount: booking.participantCount,
      refundAmount: finalRefund,
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
