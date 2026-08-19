import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { autoCompletePastTrips } from "@/lib/trip-lifecycle";

function isValidCronSecret(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  return providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf);
}

/**
 * POST /api/admin/trips/auto-complete
 *
 * Marks past-departure slots COMPLETED and unlocks customer review
 * eligibility (canReview = true) for their confirmed bookings. Previously
 * only ran opportunistically whenever a SUPER_ADMIN happened to load the
 * admin dashboard -- meaning trips silently stayed un-completed (and
 * reviews stayed locked) for however long it took an admin to next look at
 * the dashboard. Now runs on a schedule instead, mirroring
 * /api/admin/bookings/cleanup.
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
    const { completedCount, unlockedBookingsCount } = await autoCompletePastTrips();

    if (auth.authorized && "userId" in auth) {
      await logActivity("TRIP_AUTO_COMPLETE", auth.userId, "Slot", "bulk", {
        completedCount,
        unlockedBookingsCount,
      });
    }

    return NextResponse.json({
      message: `Completed ${completedCount} trip(s), unlocked reviews for ${unlockedBookingsCount} booking(s).`,
      completedCount,
      unlockedBookingsCount,
    });
  } catch (error) {
    console.error("Trip auto-complete error:", error);
    return NextResponse.json(
      { error: "Failed to auto-complete trips." },
      { status: 500 },
    );
  }
}
