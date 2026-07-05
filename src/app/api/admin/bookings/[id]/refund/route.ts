import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { sendRefundResolved } from "@/lib/email";
import { z } from "zod";

import { generateCouponCode } from "@/lib/coupon-engine";

const refundSchema = z.object({
  refundNote: z.string().min(1, "Refund note is required (coupon code or UTR number)"),
  refundAmount: z.number().optional(),
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
    const { refundNote, refundAmount } = parsed.data;

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

    const refundAmt = refundAmount !== undefined
      ? refundAmount
      : (booking.refundAmount ? Number(booking.refundAmount) : Number(booking.paidAmount));

    if (refundAmt < 0) {
      return NextResponse.json({ error: "Refund amount cannot be negative." }, { status: 400 });
    }
    if (refundAmt > Number(booking.paidAmount)) {
      return NextResponse.json({ error: `Refund amount (₹${refundAmt}) cannot exceed the paid amount (₹${Number(booking.paidAmount)}).` }, { status: 400 });
    }

    const newPaidAmount = Math.max(0, Number(booking.paidAmount) - refundAmt);
    const remainingBalance = Number(booking.totalPrice) - newPaidAmount;

    let newPaymentStatus: "REFUNDED" | "PARTIALLY_PAID" | "PAID" = "PAID";
    if (booking.bookingStatus === "CANCELLED") {
      newPaymentStatus = "REFUNDED";
    } else if (remainingBalance > 0.01) {
      newPaymentStatus = "PARTIALLY_PAID";
    }

    let couponCode = refundNote;
    if (booking.refundPreference === "COUPON") {
      couponCode = generateCouponCode("PARAM");
    }

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          paymentStatus: newPaymentStatus,
          paidAmount: newPaidAmount,
          remainingBalance: Math.max(0, remainingBalance),
          refundNote: couponCode,
          refundAmount: null,
        },
      });

      if (booking.refundPreference === "COUPON") {
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + 12); // 12 months validity

        const newCoupon = await tx.travelCoupon.create({
          data: {
            code: couponCode,
            customerId: booking.userId,
            bookingId,
            originalValue: refundAmt,
            balance: refundAmt,
            expiryDate: expiry,
            status: "ACTIVE",
            type: "CANCELLATION",
            reason: `Refund for cancelled booking ${bookingId.substring(0, 8)}`,
            issuedById: adminId,
          },
        });

        await tx.couponTransaction.create({
          data: {
            couponId: newCoupon.id,
            bookingId,
            type: "ISSUED",
            amount: refundAmt,
            previousBalance: 0,
            newBalance: refundAmt,
            remarks: `Automatically issued from refund of booking ${bookingId.substring(0, 8)}`,
          },
        });
      }
    });

    await logActivity("REFUND_RESOLVED", adminId, "Booking", bookingId, {
      refundNote: couponCode,
      refundPreference: booking.refundPreference,
      refundAmount: refundAmt,
    });

    await sendRefundResolved({
      userName: booking.user.name || "Adventurer",
      userEmail: booking.user.email,
      experienceTitle: booking.experience.title,
      slotDate: booking.slot?.date?.toISOString() ?? new Date().toISOString(),
      refundPreference: (booking.refundPreference ?? "COUPON") as "COUPON" | "BANK_REFUND",
      refundNote: couponCode,
      totalPrice: refundAmt,
      bookingId: booking.id,
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
