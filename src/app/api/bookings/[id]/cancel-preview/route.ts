import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { getRefundPercentage, calculateRefundBreakdown } from "@/lib/refund-engine";

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
    if (!participantIdsStr) {
      return NextResponse.json({ error: "Participant IDs are required." }, { status: 400 });
    }

    const participantIds = participantIdsStr.split(",").map(id => id.trim()).filter(Boolean);
    if (participantIds.length === 0) {
      return NextResponse.json({ error: "Participant IDs cannot be empty." }, { status: 400 });
    }

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

    // Verify participant IDs are valid and not already cancelled
    const activeParticipants = booking.participants.filter(p => !p.isCancelled);
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
    const experienceBasePrice = Number(booking.experience.basePrice);
    let selectedBaseFare = 0;
    const selectedParticipants = activeParticipants.filter(p => participantIds.includes(p.id));
    for (const p of selectedParticipants) {
      selectedBaseFare += experienceBasePrice;
      if (p.selectedAmenities && Array.isArray(p.selectedAmenities)) {
        for (const item of p.selectedAmenities as any[]) {
          selectedBaseFare += Number(item.price) || 0;
        }
      }
    }

    const selectedTotalPrice = Number(booking.totalPrice) * ratio;
    const selectedPaidAmount = Number(booking.paidAmount) * ratio;

    // Determine policy percentage based on departure slot date
    const departureDate = booking.slot ? new Date(booking.slot.date) : new Date();
    const { refundPercent, daysBefore } = await getRefundPercentage(departureDate, new Date());

    // Run core breakdown engine
    const breakdown = calculateRefundBreakdown({
      baseFare: selectedBaseFare,
      totalPrice: selectedTotalPrice,
      paidAmount: selectedPaidAmount,
      paymentType: booking.paymentType as "FULL" | "ADVANCE",
      refundPercent,
      taxBreakdown: booking.taxBreakdown,
    });

    return NextResponse.json({
      ...breakdown,
      daysBefore: Math.max(0, Math.floor(daysBefore)),
      refundPercent,
    });

  } catch (error) {
    console.error("Cancel preview error:", error);
    return NextResponse.json({ error: "Failed to generate cancellation preview." }, { status: 500 });
  }
}
