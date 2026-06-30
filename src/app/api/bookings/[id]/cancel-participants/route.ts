import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { z } from "zod";

const cancelSchema = z.object({
  participantIds: z.array(z.string()).min(1, "At least one participant must be specified"),
  reason: z.string().optional().or(z.literal("")),
  preference: z.enum(["COUPON", "BANK_REFUND"]),
});

// Helper to extract tax config settings
async function getTaxPercentage(): Promise<number> {
  let taxPercentage = 0;
  const taxSettings = await prisma.platformSetting.findUnique({
    where: { key: "tax_config" },
  });
  if (taxSettings?.value) {
    try {
      const config = JSON.parse(taxSettings.value);
      if (Array.isArray(config)) {
        taxPercentage = config.reduce((acc, tax: { percentage: number }) => acc + (Number(tax.percentage) || 0), 0);
      }
    } catch {
      console.error("Failed to parse tax_config");
    }
  }
  return taxPercentage;
}

// Helper to perform full booking cancellation
async function processFullCancellation(params: {
  bookingId: string;
  booking: any;
  activeCount: number;
  userId: string;
  reason?: string;
  preference: "COUPON" | "BANK_REFUND";
}) {
  const { bookingId, booking, activeCount, userId, reason, preference } = params;
  const newPaymentStatus =
    (booking.paymentStatus === "PAID" || booking.paymentStatus === "PARTIALLY_PAID")
      ? "REFUND_PENDING"
      : booking.paymentStatus;

  const refundAmount = Number(booking.paidAmount);

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
        refundAmount: refundAmount > 0 ? refundAmount : null,
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
  });

  await logActivity("BOOKING_CANCELLED", userId, "Booking", bookingId, {
    preference,
    reason: reason || "No reason provided",
    participantCount: activeCount,
  });
}

// Helper to calculate financials for partial cancellation
function computePartialFinancials(params: {
  booking: any;
  activeParticipants: any[];
  participantIds: string[];
  taxPercentage: number;
}) {
  const { booking, activeParticipants, participantIds, taxPercentage } = params;
  const experienceBasePrice = Number(booking.experience.basePrice);

  let totalCancelledBase = 0;
  let totalCancelledAmenities = 0;

  const cancelledParticipants = activeParticipants.filter((p) => participantIds.includes(p.id));

  for (const p of cancelledParticipants) {
    totalCancelledBase += experienceBasePrice;
    if (p.selectedAmenities && Array.isArray(p.selectedAmenities)) {
      const amenities = p.selectedAmenities as any[];
      for (const item of amenities) {
        totalCancelledAmenities += Number(item.price) || 0;
      }
    }
  }

  const cancelledBaseCost = totalCancelledBase + totalCancelledAmenities;
  const cancelledTax = (cancelledBaseCost * taxPercentage) / 100;
  const cancelledTotalCost = cancelledBaseCost + cancelledTax;

  // Calculate refund amount
  let refundAmount = 0;
  if (booking.paymentStatus === "PAID") {
    refundAmount = cancelledTotalCost;
  } else if (booking.paymentStatus === "PARTIALLY_PAID" && booking.paymentType === "ADVANCE") {
    const advancePerPerson = Number(booking.experience.advancePaymentAmount) || 0;
    refundAmount = advancePerPerson * participantIds.length;
  }

  const newBaseFare = Math.max(0, Number(booking.baseFare) - cancelledBaseCost);
  const newTotalPrice = Math.max(0, Number(booking.totalPrice) - cancelledTotalCost);
  const newParticipantCount = Math.max(1, booking.participantCount - participantIds.length);

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
    const taxPercentage = await getTaxPercentage();
    const financials = computePartialFinancials({
      booking,
      activeParticipants,
      participantIds,
      taxPercentage,
    });

    // Execute atomic transaction for partial cancellation
    await prisma.$transaction(async (tx) => {
      await tx.bookingParticipant.updateMany({
        where: { id: { in: participantIds } },
        data: {
          isCancelled: true,
          cancelledAt: new Date(),
        },
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          participantCount: financials.newParticipantCount,
          baseFare: financials.newBaseFare,
          totalPrice: financials.newTotalPrice,
          remainingBalance: financials.newRemainingBalance,
          refundAmount: financials.newRefundAmount > 0 ? financials.newRefundAmount : null,
          paymentStatus: financials.refundAmount > 0 ? "REFUND_PENDING" : booking.paymentStatus,
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
    });

    await logActivity("BOOKING_PARTIAL_CANCEL", userId, "Booking", bookingId, {
      preference,
      reason: reason || "No reason provided",
      cancelledParticipantIds: participantIds,
      refundAmount: financials.refundAmount,
    });

    return NextResponse.json({
      success: true,
      message: "Participants cancelled successfully.",
      refundAmount: financials.refundAmount,
    });
  } catch (error: unknown) {
    console.error("Partial cancellation error:", error);
    return NextResponse.json({ error: "Failed to process partial cancellation." }, { status: 500 });
  }
}
