import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { BookingService } from "@/services/booking.service";
import { z } from "zod";

const cancelBatchSchema = z.object({
  reason: z.string().trim().min(1, "A reason is required to cancel this trip."),
});

/**
 * POST /api/admin/trips/[id]/cancel-batch
 *
 * Cancels every booking on one trip departure (Slot) at once, for when
 * the whole trip gets called off. Restricted to SUPER_ADMIN only --
 * intentionally stricter than the usual ADMIN/SUPER_ADMIN pattern, since
 * this touches every paying customer on the trip at once and can't be
 * undone.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  if (auth.roleName !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Only a super admin can cancel an entire trip." },
      { status: 403 },
    );
  }

  try {
    const { id: slotId } = await params;
    const body = await request.json();

    const parseResult = cancelBatchSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }

    const { cancelledCount, refundsQueuedCount } = await BookingService.cancelAllBookingsForSlot(
      slotId,
      { reason: parseResult.data.reason, cancelledByUserId: auth.userId },
    );

    return NextResponse.json({
      message: `Cancelled ${cancelledCount} booking(s), queued ${refundsQueuedCount} refund(s) for review.`,
      cancelledCount,
      refundsQueuedCount,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_NOT_FOUND") {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "SLOT_NOT_CANCELLABLE") {
      return NextResponse.json(
        { error: "Only an upcoming trip can be cancelled this way." },
        { status: 400 },
      );
    }
    console.error("Batch cancel trip error:", error);
    return NextResponse.json(
      { error: "Failed to cancel this trip." },
      { status: 500 },
    );
  }
}
