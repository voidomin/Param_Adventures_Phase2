import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest, resolveCronAuthDenial } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { sendStaffingEscalationAlerts } from "@/lib/trip-lifecycle";

/**
 * POST /api/admin/trips/send-staffing-alerts
 *
 * Escalates unstaffed UPCOMING trips as departure approaches: no Trip
 * Manager assigned (3 days or less out) alerts every Admin/Super Admin;
 * a Trip Manager assigned but no Trek Lead (1 day or less out) alerts
 * that manager. Each alert fires at most once per slot.
 *
 * Auth: Requires "ops:assign-trek-leads" permission,
 * OR a valid x-cron-secret header for automated jobs.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "ops:assign-trek-leads");
  const denied = resolveCronAuthDenial(auth, request);
  if (denied) return denied;

  try {
    const { managerAlertsSent, trekLeadAlertsSent } = await sendStaffingEscalationAlerts();

    if (managerAlertsSent === 0 && trekLeadAlertsSent === 0) {
      return NextResponse.json({
        message: "No staffing escalation alerts due.",
        managerAlertsSent: 0,
        trekLeadAlertsSent: 0,
      });
    }

    if (auth.authorized && "userId" in auth) {
      await logActivity("TRIP_STAFFING_ALERTS_SENT", auth.userId, "Slot", "bulk", {
        managerAlertsSent,
        trekLeadAlertsSent,
      });
    }

    return NextResponse.json({
      message: `Sent ${managerAlertsSent} manager alert(s) and ${trekLeadAlertsSent} trek lead alert(s).`,
      managerAlertsSent,
      trekLeadAlertsSent,
    });
  } catch (error) {
    console.error("Send staffing alerts error:", error);
    return NextResponse.json(
      { error: "Failed to send staffing escalation alerts." },
      { status: 500 },
    );
  }
}
