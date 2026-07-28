import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";

/**
 * DELETE /api/admin/bookings/[id] — Soft-delete (archive) a booking.
 * Required permissions: "booking:moderate" or "booking:cancel"
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request, ["booking:moderate", "booking:cancel"]);
  if (!auth.authorized) return auth.response;

  const { id: bookingId } = await params;
  const adminId = auth.userId;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, bookingStatus: true }
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    // A CONFIRMED booking is still holding a seat's worth of slot capacity.
    // Archiving it here would never return that capacity, silently leaking a
    // seat -- so route admins through the cancel/refund flow instead, which
    // already handles restoring capacity correctly.
    if (booking.bookingStatus === "CONFIRMED") {
      return NextResponse.json(
        { error: "This booking is confirmed and holding slot capacity. Cancel and refund it first before archiving." },
        { status: 409 }
      );
    }

    // Soft-delete by setting deletedAt to current time
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        deletedAt: new Date()
      }
    });

    await logActivity(
      "BOOKING_ARCHIVED",
      adminId,
      "Booking",
      bookingId,
      { archivedAt: new Date() }
    );

    return NextResponse.json({
      success: true,
      message: "Booking archived successfully."
    });

  } catch (error: unknown) {
    console.error("Error archiving booking:", error);
    return NextResponse.json(
      { error: "Failed to archive booking." },
      { status: 500 }
    );
  }
}
