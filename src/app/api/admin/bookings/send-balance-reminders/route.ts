import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest, resolveCronAuthDenial } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { BookingService } from "@/services/booking.service";

/**
 * POST /api/admin/bookings/send-balance-reminders
 *
 * Sends balance-payment reminder emails for CONFIRMED advance-payment
 * bookings approaching their balance-payment deadline -- a first reminder
 * at 3 days or less remaining, a final one at 1 day or less. Each fires at
 * most once per booking. Purely a notification: never touches money,
 * booking status, or slot capacity.
 *
 * Auth: Requires "booking:moderate" permission,
 * OR a valid x-cron-secret header for automated jobs.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "booking:moderate");
  const denied = resolveCronAuthDenial(auth, request);
  if (denied) return denied;

  try {
    const { firstSent, finalSent } = await BookingService.sendBalancePaymentReminders();

    if (firstSent === 0 && finalSent === 0) {
      return NextResponse.json({ message: "No balance-payment reminders due.", firstSent: 0, finalSent: 0 });
    }

    if (auth.authorized && "userId" in auth) {
      await logActivity("BALANCE_PAYMENT_REMINDERS_SENT", auth.userId, "Booking", "bulk", { firstSent, finalSent });
    }

    return NextResponse.json({
      message: `Sent ${firstSent} first reminder(s) and ${finalSent} final reminder(s).`,
      firstSent,
      finalSent,
    });
  } catch (error) {
    console.error("Send balance payment reminders error:", error);
    return NextResponse.json(
      { error: "Failed to send balance payment reminders." },
      { status: 500 },
    );
  }
}
