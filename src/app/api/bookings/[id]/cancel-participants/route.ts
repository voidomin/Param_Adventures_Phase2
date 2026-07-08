import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PaymentStatus } from "@prisma/client";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { z } from "zod";
import { getRefundPercentage, calculateRefundBreakdown } from "@/lib/refund-engine";
import { restoreCouponsForBooking, generateCouponCode } from "@/lib/coupon-engine";
import { sendRefundResolved } from "@/lib/email";

const cancelSchema = z.object({
  participantIds: z.array(z.string()).min(1, "At least one participant must be specified"),
  reason: z.string().optional().or(z.literal("")),
  preference: z.enum(["COUPON", "BANK_REFUND"]),
});

interface CancelBookingInput {
  slot: { date: string | Date } | null;
  baseFare: unknown;
  totalPrice: unknown;
  paidAmount: unknown;
  paymentType: string;
  paymentStatus: string;
  bookingStatus: string;
  slotId?: string | null;
  userId: string;
  participantCount: number;
  refundAmount?: unknown;
  taxBreakdown: unknown;
  experience?: { basePrice: unknown } | null;
}

interface CancelParticipantInput {
  id: string;
  selectedAmenities?: unknown;
}

interface AmenityInput {
  price: unknown;
}

// Helper to perform full booking cancellation using refund-engine
async function processFullCancellation(params: {
  bookingId: string;
  booking: CancelBookingInput;
  activeCount: number;
  userId: string;
  reason?: string;
  preference: "COUPON" | "BANK_REFUND";
}) {
  const { bookingId, booking, activeCount, userId, reason, preference } = params;

  // Resolve cancellation policy based on departure date
  const departureDate = booking.slot ? new Date(booking.slot.date) : new Date();
  const { refundPercent } = await getRefundPercentage(departureDate, new Date());

  const breakdown = calculateRefundBreakdown({
    baseFare: Number(booking.baseFare),
    totalPrice: Number(booking.totalPrice),
    paidAmount: Number(booking.paidAmount),
    paymentType: booking.paymentType as "FULL" | "ADVANCE",
    refundPercent,
    taxBreakdown: booking.taxBreakdown,
    refundPreference: preference,
  });

  const finalRefund = breakdown.finalRefundAmount;

  // If selecting coupon refund, booking paymentStatus does not need to remain REFUND_PENDING
  const newPaymentStatus =
    preference === "BANK_REFUND" && (booking.paymentStatus === "PAID" || booking.paymentStatus === "PARTIALLY_PAID") && finalRefund > 0
      ? "REFUND_PENDING"
      : finalRefund > 0 && preference === "COUPON"
      ? "REFUNDED"
      : booking.paymentStatus;

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        bookingStatus: "CANCELLED",
        paymentStatus: newPaymentStatus as PaymentStatus,
        cancelledAt: new Date(),
        cancelledByUserId: userId,
        cancellationReason: reason || null,
        refundPreference: preference,
        refundAmount: finalRefund > 0 && preference === "BANK_REFUND" ? finalRefund : null,
        refundNote: preference === "COUPON" ? "Travel Coupon Refund Issued" : null,
      },
    });

    // Mark all active participants as cancelled
    await tx.bookingParticipant.updateMany({
      where: { bookingId, isCancelled: false },
      data: {
        isCancelled: true,
        cancelledAt: new Date(),
      },
    });

    if (booking.slotId && booking.bookingStatus === "CONFIRMED") {
      await tx.slot.update({
        where: { id: booking.slotId },
        data: {
          remainingCapacity: { increment: activeCount },
        },
      });
    }

    // Restore coupons originally used in the booking
    await restoreCouponsForBooking({
      bookingId,
      cancellationCharges: Number(breakdown.cancellationCharges),
      tx,
    });

    // Create travel coupon if coupon preference is selected
    if (preference === "COUPON" && finalRefund > 0) {
      const couponCode = generateCouponCode("PARAM");
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + 12); // Travel Coupon valid for 12 months

      const newCoupon = await tx.travelCoupon.create({
        data: {
          code: couponCode,
          customerId: booking.userId,
          bookingId,
          originalValue: finalRefund,
          balance: finalRefund,
          expiryDate: expiry,
          status: "ACTIVE",
          type: "CANCELLATION",
          reason: `Refund for cancelled booking ${bookingId.substring(0, 8)}`,
        },
      });

      await tx.couponTransaction.create({
        data: {
          couponId: newCoupon.id,
          bookingId,
          type: "ISSUED",
          amount: finalRefund,
          previousBalance: 0,
          newBalance: finalRefund,
          remarks: `Issued Travel Coupon refund for booking ${bookingId.substring(0, 8)}`,
        },
      });
    } else if (preference === "BANK_REFUND" && finalRefund > 0) {
      // Create Refund Request if bank transfer and refund is due
      await tx.refundRequest.create({
        data: {
          bookingId,
          customerId: booking.userId,
          refundMethod: "BANK_TRANSFER",
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
  });

  await logActivity("BOOKING_CANCELLED", userId, "Booking", bookingId, {
    preference,
    reason: reason || "No reason provided",
    participantCount: activeCount,
    refundAmount: finalRefund,
  });
}

// Helper to calculate financials for partial cancellation using refund-engine
async function calculateRefundProportional(params: {
  booking: CancelBookingInput;
  activeParticipants: CancelParticipantInput[];
  participantIds: string[];
  preference: "COUPON" | "BANK_REFUND";
}) {
  const { booking, activeParticipants, participantIds, preference } = params;
  const experienceBasePrice = Number(booking.experience?.basePrice || 0);

  let totalCancelledBase = 0;
  const cancelledParticipants = activeParticipants.filter((p) => participantIds.includes(p.id));

  for (const p of cancelledParticipants) {
    totalCancelledBase += experienceBasePrice;
    if (p.selectedAmenities && Array.isArray(p.selectedAmenities)) {
      for (const item of p.selectedAmenities as AmenityInput[]) {
        totalCancelledBase += Number(item.price) || 0;
      }
    }
  }

  // Calculate proportional totals for the cancelled participants
  const totalActiveCount = activeParticipants.length;
  const cancelledCount = participantIds.length;
  const ratio = cancelledCount / totalActiveCount;

  const proportionalTotalPrice = Number(booking.totalPrice) * ratio;
  const proportionalPaidAmount = Number(booking.paidAmount) * ratio;

  // Resolve cancellation policy based on departure date
  const departureDate = booking.slot ? new Date(booking.slot.date) : new Date();
  const { refundPercent } = await getRefundPercentage(departureDate, new Date());

  const breakdown = calculateRefundBreakdown({
    baseFare: totalCancelledBase,
    totalPrice: proportionalTotalPrice,
    paidAmount: proportionalPaidAmount,
    paymentType: booking.paymentType as "FULL" | "ADVANCE",
    refundPercent,
    taxBreakdown: booking.taxBreakdown,
    refundPreference: preference,
  });

  const refundAmount = breakdown.finalRefundAmount;

  const newBaseFare = Math.max(0, Number(booking.baseFare) - totalCancelledBase);
  const newTotalPrice = Math.max(0, Number(booking.totalPrice) - proportionalTotalPrice);
  const newParticipantCount = Math.max(1, booking.participantCount - cancelledCount);

  let newRemainingBalance = 0;
  if (booking.paymentStatus === "PARTIALLY_PAID") {
    const netPaid = Math.max(0, Number(booking.paidAmount) - refundAmount);
    newRemainingBalance = Math.max(0, newTotalPrice - netPaid);
  }

  const newRefundAmount = Number(booking.refundAmount || 0) + refundAmount;

  return {
    newBaseFare,
    newTotalPrice,
    newParticipantCount,
    newRemainingBalance,
    newRefundAmount,
    refundAmount,
    breakdown,
  };
}

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
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { participantIds, reason, preference } = parsed.data;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        participants: true,
        experience: true,
        slot: true,
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
      return NextResponse.json({ error: "Booking is already cancelled." }, { status: 409 });
    }
    if (booking.bookingStatus !== "REQUESTED" && booking.bookingStatus !== "CONFIRMED") {
      return NextResponse.json({ error: "This booking cannot be cancelled." }, { status: 409 });
    }

    const activeParticipants = booking.participants.filter((p) => !p.isCancelled);
    const activeIds = new Set(activeParticipants.map((p) => p.id));

    // Verify all participantIds are active in this booking
    const invalidIds = participantIds.filter((id) => !activeIds.has(id));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `Invalid or already cancelled participant IDs: ${invalidIds.join(", ")}` },
        { status: 400 }
      );
    }

    const isFullCancellation = activeParticipants.length === participantIds.length;

    if (isFullCancellation) {
      await processFullCancellation({
        bookingId,
        booking,
        activeCount: activeParticipants.length,
        userId,
        reason,
        preference,
      });
      return NextResponse.json({ success: true, message: "Booking fully cancelled." });
    }

    // Process partial cancellation
    const financials = await calculateRefundProportional({
      booking,
      activeParticipants,
      participantIds,
      preference,
    });

      let generatedCoupon = "";

      // Execute atomic transaction for partial cancellation
      await prisma.$transaction(async (tx) => {
        await tx.bookingParticipant.updateMany({
          where: { id: { in: participantIds } },
          data: {
            isCancelled: true,
            cancelledAt: new Date(),
          },
        });

        const newPaymentStatus =
          preference === "BANK_REFUND" && financials.refundAmount > 0
            ? "REFUND_PENDING"
            : financials.refundAmount > 0 && preference === "COUPON"
            ? "PARTIALLY_PAID"
            : booking.paymentStatus;

        await tx.booking.update({
          where: { id: bookingId },
          data: {
            participantCount: financials.newParticipantCount,
            baseFare: financials.newBaseFare,
            totalPrice: financials.newTotalPrice,
            remainingBalance: financials.newRemainingBalance,
            refundAmount: preference === "BANK_REFUND" && financials.newRefundAmount > 0 ? financials.newRefundAmount : null,
            paymentStatus: newPaymentStatus,
            cancellationReason: reason || null,
            refundPreference: preference,
          },
        });

        if (booking.slotId && booking.bookingStatus === "CONFIRMED") {
          await tx.slot.update({
            where: { id: booking.slotId },
            data: {
              remainingCapacity: { increment: participantIds.length },
            },
          });
        }

        // Restore coupons originally used in the booking
        await restoreCouponsForBooking({
          bookingId,
          cancellationCharges: Number(financials.breakdown.cancellationCharges),
          tx,
        });

        // Create Travel Coupon if coupon preference is selected
        if (preference === "COUPON" && financials.refundAmount > 0) {
          generatedCoupon = generateCouponCode("PARAM");
          const expiry = new Date();
          expiry.setMonth(expiry.getMonth() + 12);

          const newCoupon = await tx.travelCoupon.create({
            data: {
              code: generatedCoupon,
              customerId: booking.userId,
              bookingId,
              originalValue: financials.refundAmount,
              balance: financials.refundAmount,
              expiryDate: expiry,
              status: "ACTIVE",
              type: "CANCELLATION",
              reason: `Partial refund for cancelled booking ${bookingId.substring(0, 8)}`,
            },
          });

          await tx.couponTransaction.create({
            data: {
              couponId: newCoupon.id,
              bookingId,
              type: "ISSUED",
              amount: financials.refundAmount,
              previousBalance: 0,
              newBalance: financials.refundAmount,
              remarks: `Issued travel coupon refund for partial cancellation of booking ${bookingId.substring(0, 8)}`,
            },
          });
        } else if (preference === "BANK_REFUND" && financials.refundAmount > 0) {
          // Create Refund Request if bank transfer and refund is due
          await tx.refundRequest.create({
            data: {
              bookingId,
              customerId: booking.userId,
              refundMethod: "BANK_TRANSFER",
              baseFare: financials.breakdown.baseFare,
              gst: financials.breakdown.gst,
              convenienceFee: financials.breakdown.convenienceFee,
              cancellationPercent: financials.breakdown.cancellationPercent,
              cancellationCharges: financials.breakdown.cancellationCharges,
              finalRefundAmount: financials.breakdown.finalRefundAmount,
              status: "REQUESTED",
            },
          });
        }
      });

      // Email the travel coupon immediately if generated
      if (preference === "COUPON" && financials.refundAmount > 0 && generatedCoupon) {
        try {
          await sendRefundResolved({
            userName: booking.user.name || "Adventurer",
            userEmail: booking.user.email,
            experienceTitle: booking.experience.title,
            slotDate: booking.slot?.date?.toISOString() ?? new Date().toISOString(),
            refundPreference: "COUPON",
            refundNote: generatedCoupon,
            totalPrice: financials.refundAmount,
            bookingId: booking.id,
          });
        } catch (emailErr) {
          console.error("[CancelParticipants] Error sending coupon refund email:", emailErr);
        }
      }

    await logActivity("BOOKING_PARTIAL_CANCEL", userId, "Booking", bookingId, {
      preference,
      reason: reason || "No reason provided",
      participantCount: participantIds.length,
      refundAmount: financials.refundAmount,
    });

    return NextResponse.json({ success: true, message: "Participants cancelled successfully." });

  } catch (error) {
    console.error("Cancel participants error:", error);
    return NextResponse.json({ error: "Failed to cancel participants." }, { status: 500 });
  }
}
