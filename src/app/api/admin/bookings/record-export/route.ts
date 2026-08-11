import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";

/**
 * POST /api/admin/bookings/record-export
 *
 * The GST ledger PDF/Excel export (InvoicesTab) is generated entirely
 * client-side -- it builds the file in the browser from data already
 * fetched via GET /api/admin/bookings, so there's no server-side request
 * to naturally hang an audit entry off. This endpoint exists purely to
 * record that an export happened: who, what filters, how many rows --
 * never the exported rows themselves, which can include customer names,
 * emails, and payment amounts.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "booking:view-all");
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { format, filters, rowCount } = body as {
      format?: string;
      filters?: Record<string, unknown>;
      rowCount?: number;
    };

    await logActivity("BOOKING_EXPORT_GENERATED", auth.userId, "Booking", null, {
      format,
      filters,
      rowCount,
    });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Record export error:", error);
    return NextResponse.json({ error: "Failed to record export." }, { status: 500 });
  }
}
