import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { getRefundPercentage, calculateRefundBreakdown } from "@/lib/refund-engine";
import { restoreCouponsForBooking } from "@/lib/coupon-engine";

interface PreviewParticipant {
  id: string;
  selectedAmenities?: unknown;
}

interface PreviewAmenity {
  price: unknown;
}

function calculateSelectedBaseFare(
  participants: PreviewParticipant[],
  participantIds: string[],
  experienceBasePrice: number
): number {
  let selectedBaseFare = 0;
  const selectedParticipants = participants.filter(p => participantIds.includes(p.id));
  for (const p of selectedParticipants) {
    let participantFare = experienceBasePrice;
    if (p.selectedAmenities && Array.isArray(p.selectedAmenities)) {
      for (const item of p.selectedAmenities as PreviewAmenity[]) {
        participantFare += Number(item.price) || 0;
      }
    }
    selectedBaseFare += Math.max(0, participantFare);
  }
  return selectedBaseFare;
}

/**
 * GET /api/bookings/[id]/cancel-preview?participantIds=id1,id2
 * Preview cancellation refund details before submitting cancellation.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  const { id: bookingId } = await params;
  const userId = auth.userId;

  try {
    const { searchParams } = new URL(request.url);
    const participantIdsStr = searchParams.get("participantIds");

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

    // Only the customer who booked or an admin/super_admin can view preview
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    const isAdmin = user?.role?.name === "ADMIN" || user?.role?.name === "SUPER_ADMIN";
    if (booking.userId !== userId && !isAdmin) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const activeParticipants = booking.participants.filter(p => !p.isCancelled);
    const participantIds = participantIdsStr
      ? participantIdsStr.split(",").map(id => id.trim()).filter(Boolean)
      : activeParticipants.map(p => p.id);

    if (participantIds.length === 0) {
      return NextResponse.json({ error: "No active participants found to cancel." }, { status: 400 });
    }

    // Verify participant IDs are valid and not already cancelled
    const activeIds = new Set(activeParticipants.map(p => p.id));
    const invalidIds = participantIds.filter(id => !activeIds.has(id));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `Invalid or already cancelled participant IDs: ${invalidIds.join(", ")}` },
        { status: 400 }
      );
    }

    // Proportional ratios for calculation
    const totalActiveCount = activeParticipants.length;
    const cancelledCount = participantIds.length;
    const ratio = cancelledCount / totalActiveCount;

    // Calculate base price for selected participants (including amenities)
    const selectedBaseFare = calculateSelectedBaseFare(
      activeParticipants,
      participantIds,
      Number(booking.experience.basePrice)
    );

    const selectedTotalPrice = Number(booking.totalPrice) * ratio;
    const selectedPaidAmount = Number(booking.paidAmount) * ratio;

    // Determine policy percentage based on departure slot date
    const departureDate = booking.slot ? new Date(booking.slot.date) : new Date();
    const { refundPercent, daysBefore } = await getRefundPercentage(departureDate, new Date(), booking.experience.cancellationPolicyGroup);

    const preference = (searchParams.get("preference") as "COUPON" | "BANK_REFUND" | null) || "COUPON";

    // Run core breakdown engine
    const breakdown = calculateRefundBreakdown({
      baseFare: selectedBaseFare,
      totalPrice: selectedTotalPrice,
      paidAmount: selectedPaidAmount,
      paymentType: booking.paymentType as "FULL" | "ADVANCE",
      refundPercent,
      taxBreakdown: booking.taxBreakdown,
      refundPreference: preference,
      // An admin-initiated cancellation isn't the customer choosing to
      // walk away, so it isn't bound by the day-based cancellation-charge
      // tiers -- it defaults to a full refund of whatever was actually
      // paid, same as the automated company-side cancellation paths.
      // This is a preview only: the admin can still override the amount
      // before confirming (see cancel-participants).
      isCompanyCancellation: isAdmin,
    });

    // Preview only -- nothing is written yet. If this booking redeemed a
    // coupon, this shows what would be restored to it once an admin
    // approves the refund; the actual restoration only happens then.
    const { totalRestored: couponRestoreAmount } = await restoreCouponsForBooking({
      bookingId,
      cancellationCharges: Number(breakdown.cancellationCharges),
      tx: prisma,
      dryRun: true,
    });

    return NextResponse.json({
      ...breakdown,
      daysBefore: Math.max(0, Math.floor(daysBefore)),
      refundPercent,
      couponRestoreAmount,
    });

  } catch (error) {
    console.error("Cancel preview error:", error);
    return NextResponse.json({ error: "Failed to generate cancellation preview." }, { status: 500 });
  }
}
