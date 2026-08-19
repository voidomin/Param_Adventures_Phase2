import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { BookingService } from "@/services/booking.service";

function isValidCronSecret(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  return providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf);
}

/**
 * POST /api/admin/bookings/cleanup
 *
 * Target: Cancels bookings stuck in REQUESTED/PENDING state for more than
 * 24 hours, restoring the slot capacity each one reserved when it was
 * created. Delegates to BookingService.autoExpireAbandonedBookings() --
 * the same function the admin dashboard's opportunistic auto-expiry call
 * uses -- so there is exactly one implementation of this rule, not two
 * drifting in parallel.
 *
 * Auth: Requires "booking:moderate" permission,
 * OR a valid x-cron-secret header for automated jobs.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "booking:moderate");

  if (!auth.authorized) {
    const cronSecret = request.headers.get("x-cron-secret");
    if (!isValidCronSecret(cronSecret, process.env.CRON_SECRET)) {
       return auth.response;
    }
  }

  try {
    const restoredCount = await BookingService.autoExpireAbandonedBookings();

    if (restoredCount === 0) {
      return NextResponse.json({ message: "No abandoned bookings found.", count: 0 });
    }

    if (auth.authorized && 'userId' in auth) {
        await logActivity("BOOKING_CLEANUP", auth.userId, "Booking", "bulk", { restoredCount });
    }

    return NextResponse.json({
      message: `Successfully cancelled ${restoredCount} abandoned booking(s).`,
      count: restoredCount,
    });
  } catch (error) {
    console.error("Cleanup abandoned bookings error:", error);
    return NextResponse.json(
      { error: "Failed to cleanup abandoned bookings." },
      { status: 500 },
    );
  }
}
