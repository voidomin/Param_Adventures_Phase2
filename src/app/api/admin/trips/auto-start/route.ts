import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest, resolveCronAuthDenial } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { autoStartTrips } from "@/lib/trip-lifecycle";

/**
 * POST /api/admin/trips/auto-start
 *
 * Marks UPCOMING slots whose departure date has arrived as ACTIVE (the
 * same effect as a manager's manual "Start Trip" action), as long as at
 * least one Trek Lead is already assigned -- mirrors
 * /api/admin/trips/auto-complete, just for the start of a trip's
 * lifecycle instead of the end.
 *
 * Auth: Requires "booking:moderate" permission,
 * OR a valid x-cron-secret header for automated jobs.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "booking:moderate");
  const denied = resolveCronAuthDenial(auth, request);
  if (denied) return denied;

  try {
    const { startedCount, skippedUnstaffedCount } = await autoStartTrips();

    if (auth.authorized && "userId" in auth) {
      await logActivity("TRIP_AUTO_START", auth.userId, "Slot", "bulk", {
        startedCount,
        skippedUnstaffedCount,
      });
    }

    return NextResponse.json({
      message: `Started ${startedCount} trip(s), skipped ${skippedUnstaffedCount} unstaffed trip(s).`,
      startedCount,
      skippedUnstaffedCount,
    });
  } catch (error) {
    console.error("Trip auto-start error:", error);
    return NextResponse.json(
      { error: "Failed to auto-start trips." },
      { status: 500 },
    );
  }
}
