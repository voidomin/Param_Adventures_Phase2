import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest, resolveCronAuthDenial } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { BookingService } from "@/services/booking.service";

/**
 * POST /api/admin/bookings/cancel-unpaid-advance
 *
 * Auto-cancels CONFIRMED advance-payment bookings whose remaining balance
 * is still unpaid within 7 days of departure, restores the slot capacity
 * they were holding, and creates a REQUESTED RefundRequest for the full
 * advance amount. This never disburses anything -- an admin/super-admin
 * must still approve every one of these refund requests, same as any
 * customer-initiated cancellation.
 *
 * Auth: Requires "booking:moderate" permission,
 * OR a valid x-cron-secret header for automated jobs.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "booking:moderate");
  const denied = resolveCronAuthDenial(auth, request);
  if (denied) return denied;

  try {
    const cancelledCount = await BookingService.autoCancelUnpaidAdvanceBookings();

    if (cancelledCount === 0) {
      return NextResponse.json({ message: "No unpaid advance bookings due for auto-cancellation.", count: 0 });
    }

    if (auth.authorized && "userId" in auth) {
      await logActivity("ADVANCE_BOOKING_AUTO_CANCEL", auth.userId, "Booking", "bulk", { cancelledCount });
    }

    return NextResponse.json({
      message: `Auto-cancelled ${cancelledCount} unpaid advance booking(s).`,
      count: cancelledCount,
    });
  } catch (error) {
    console.error("Auto-cancel unpaid advance bookings error:", error);
    return NextResponse.json(
      { error: "Failed to auto-cancel unpaid advance bookings." },
      { status: 500 },
    );
  }
}
