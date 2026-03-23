import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { sendRefundResolved } from "@/lib/email";
import { z } from "zod";

const refundSchema = z.object({
  refundNote: z.string().min(1, "Refund note is required (coupon code or UTR number)"),
});

/**
 * POST /api/admin/bookings/[id]/refund
 * Admin resolves a pending refund (marks REFUNDED + records note).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request, ["booking:cancel"]);
  if (!auth.authorized) return auth.response;

  const { id: bookingId } = await params;
  const adminId = auth.userId;

  try {
    const body = await request.json();
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { refundNote } = parsed.data;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        experience: { select: { title: true } },
        slot: true,
        user: { select: { name: true, email: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
    if (booking?.paymentStatus !== "REFUND_PENDING") {
      return NextResponse.json(
        { error: "Booking is not awaiting a refund." },
        { status: 409 }
      );
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: "REFUNDED",
        refundNote,
      },
    });

    await logActivity("REFUND_RESOLVED", adminId, "Booking", bookingId, {
      refundNote,
      refundPreference: booking.refundPreference,
    });

    await sendRefundResolved({
      userName: booking.user.name || "Adventurer",
      userEmail: booking.user.email,
      experienceTitle: booking.experience.title,
      slotDate: booking.slot?.date?.toISOString() ?? new Date().toISOString(),
      refundPreference: (booking.refundPreference ?? "COUPON") as any,
      refundNote,
      totalPrice: Number(booking.totalPrice),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Refund resolution error:", error);
    return NextResponse.json(
      { error: "Failed to resolve refund." },
      { status: 500 }
    );
  }
}
