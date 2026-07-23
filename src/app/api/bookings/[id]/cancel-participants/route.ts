import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PaymentStatus, Prisma } from "@prisma/client";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { z } from "zod";
import { getRefundPercentage, calculateRefundBreakdown } from "@/lib/refund-engine";
import { restoreCouponsForBooking } from "@/lib/coupon-engine";

const cancelSchema = z.object({
  participantIds: z.array(z.string()).min(1),
  reason: z.string().optional(),
  preference: z.enum(["BANK_REFUND", "COUPON", "NO_REFUND"]).optional().default("BANK_REFUND"),
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
  preference: "COUPON" | "BANK_REFUND" | "NO_REFUND";
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
    refundPreference: preference === "NO_REFUND" ? "BANK_REFUND" : preference,
  });

  const finalRefund = preference === "NO_REFUND" ? 0 : breakdown.finalRefundAmount;

  // If selecting coupon refund or bank refund, booking paymentStatus becomes REFUND_PENDING
  let newPaymentStatus = booking.paymentStatus;
  if ((preference === "BANK_REFUND" || preference === "COUPON") && (booking.paymentStatus === "PAID" || booking.paymentStatus === "PARTIALLY_PAID") && finalRefund > 0) {
    newPaymentStatus = "REFUND_PENDING";
  } else if (preference === "NO_REFUND") {
    newPaymentStatus = "PAID";
  }

  await prisma.$transaction(async (tx) => {
    const current = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { bookingStatus: true },
    });
    if (!current || current.bookingStatus === "CANCELLED") {
      throw new Error("Booking is already cancelled.");
    }

    let refundNote: string | null = null;
    if (preference === "NO_REFUND") {
      refundNote = "No Refund Issued (Admin Decision)";
    }

    await tx.booking.update({
      where: { id: bookingId },
      data: {
        bookingStatus: "CANCELLED",
        paymentStatus: newPaymentStatus as PaymentStatus,
        cancelledAt: new Date(),
        cancelledByUserId: userId,
        cancellationReason: reason || null,
        refundPreference: preference,
        refundAmount: finalRefund > 0 && (preference === "BANK_REFUND" || preference === "COUPON") ? finalRefund : null,
        refundNote,
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

    // Create refund request if refund is due
    if (finalRefund > 0) {
      if (preference === "COUPON") {
        await tx.refundRequest.create({
          data: {
            bookingId,
            customerId: booking.userId,
            refundMethod: "TRAVEL_COUPON",
            baseFare: breakdown.baseFare,
            gst: breakdown.gst,
            convenienceFee: breakdown.convenienceFee,
            cancellationPercent: breakdown.cancellationPercent,
            cancellationCharges: breakdown.cancellationCharges,
            finalRefundAmount: breakdown.finalRefundAmount,
            status: "REQUESTED",
          },
        });
      } else if (preference === "BANK_REFUND") {
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
  preference: "COUPON" | "BANK_REFUND" | "NO_REFUND";
}) {
  const { booking, activeParticipants, participantIds, preference } = params;
  const experienceBasePrice = Number(booking.experience?.basePrice || 0);

  let totalCancelledBase = 0;
  const cancelledParticipants = activeParticipants.filter((p) => participantIds.includes(p.id));

  for (const p of cancelledParticipants) {
    let participantFare = experienceBasePrice;
    if (p.selectedAmenities && Array.isArray(p.selectedAmenities)) {
      for (const item of p.selectedAmenities as AmenityInput[]) {
        participantFare += Number(item.price) || 0;
      }
    }
    totalCancelledBase += Math.max(0, participantFare);
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
    refundPreference: preference === "NO_REFUND" ? "BANK_REFUND" : preference,
  });

  const refundAmount = preference === "NO_REFUND" ? 0 : breakdown.finalRefundAmount;

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

type BookingWithRelations = Prisma.BookingGetPayload<{
  include: {
    participants: true;
    experience: true;
    slot: true;
    user: { select: { name: true; email: true } };
  };
}>;

function validateBookingCancellation(params: {
  booking: BookingWithRelations | null;
  userId: string;
  roleName: string;
  participantIds: string[];
}) {
  const { booking, userId, roleName, participantIds } = params;
  if (!booking) return { error: "Booking not found.", status: 404 };
  const isModerator = roleName === "ADMIN" || roleName === "SUPER_ADMIN";
  if (booking.userId !== userId && !isModerator) return { error: "Forbidden.", status: 403 };
  if (booking.bookingStatus === "CANCELLED") return { error: "Booking is already cancelled.", status: 409 };
  if (booking.bookingStatus !== "REQUESTED" && booking.bookingStatus !== "CONFIRMED") {
    return { error: "This booking cannot be cancelled.", status: 409 };
  }

  const activeParticipants = booking.participants.filter((p) => !p.isCancelled);
  const activeIds = new Set(activeParticipants.map((p) => p.id));
  const invalidIds = participantIds.filter((id) => !activeIds.has(id));
  if (invalidIds.length > 0) {
    return { error: `Invalid or already cancelled participant IDs: ${invalidIds.join(", ")}`, status: 400 };
  }

  return {
    activeParticipants,
    isFullCancellation: activeParticipants.length === participantIds.length
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

    const validation = validateBookingCancellation({
      booking,
      userId,
      roleName: auth.roleName,
      participantIds,
    });
    if ("error" in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { activeParticipants, isFullCancellation } = validation;
    const dbBooking = booking!;

    if (isFullCancellation) {
      await processFullCancellation({
        bookingId,
        booking: dbBooking,
        activeCount: activeParticipants.length,
        userId,
        reason,
        preference,
      });
      return NextResponse.json({ success: true, message: "Booking fully cancelled." });
    }

    // Process partial cancellation
    const financials = await calculateRefundProportional({
      booking: dbBooking,
      activeParticipants,
      participantIds,
      preference,
    });

      // Execute atomic transaction for partial cancellation
      await prisma.$transaction(async (tx) => {
        const cancelledCount = await tx.bookingParticipant.count({
          where: {
            id: { in: participantIds },
            isCancelled: true,
          },
        });
        if (cancelledCount > 0) {
          throw new Error("One or more participants are already cancelled.");
        }

        await tx.bookingParticipant.updateMany({
          where: { id: { in: participantIds } },
          data: {
            isCancelled: true,
            cancelledAt: new Date(),
          },
        });

        let newPaymentStatus = dbBooking.paymentStatus;
        if ((preference === "BANK_REFUND" || preference === "COUPON") && financials.refundAmount > 0) {
          newPaymentStatus = "REFUND_PENDING";
        }

        await tx.booking.update({
          where: { id: bookingId },
          data: {
            participantCount: financials.newParticipantCount,
            baseFare: financials.newBaseFare,
            totalPrice: financials.newTotalPrice,
            remainingBalance: financials.newRemainingBalance,
            refundAmount: (preference === "BANK_REFUND" || preference === "COUPON") && financials.newRefundAmount > 0 ? financials.newRefundAmount : null,
            paymentStatus: newPaymentStatus,
            cancellationReason: reason || null,
            refundPreference: preference,
          },
        });

        if (dbBooking.slotId && dbBooking.bookingStatus === "CONFIRMED") {
          await tx.slot.update({
            where: { id: dbBooking.slotId },
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

        // Create Refund Request if refund is due
        if (financials.refundAmount > 0) {
          if (preference === "COUPON") {
            await tx.refundRequest.create({
              data: {
                bookingId,
                customerId: dbBooking.userId,
                refundMethod: "TRAVEL_COUPON",
                baseFare: financials.breakdown.baseFare,
                gst: financials.breakdown.gst,
                convenienceFee: financials.breakdown.convenienceFee,
                cancellationPercent: financials.breakdown.cancellationPercent,
                cancellationCharges: financials.breakdown.cancellationCharges,
                finalRefundAmount: financials.breakdown.finalRefundAmount,
                status: "REQUESTED",
              },
            });
          } else if (preference === "BANK_REFUND") {
            await tx.refundRequest.create({
              data: {
                bookingId,
                customerId: dbBooking.userId,
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
        }
      });

    await logActivity("BOOKING_PARTIAL_CANCEL", userId, "Booking", bookingId, {
      preference,
      reason: reason || "No reason provided",
      participantCount: participantIds.length,
      refundAmount: financials.refundAmount,
    });

    return NextResponse.json({ success: true, message: "Participants cancelled successfully." });

  } catch (error) {
    console.error("Cancel participants error:", error);
    if (error instanceof Error && (error.message.includes("already cancelled") || error.message.includes("does not exist"))) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to cancel participants." }, { status: 500 });
  }
}
