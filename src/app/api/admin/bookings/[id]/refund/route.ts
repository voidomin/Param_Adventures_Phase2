import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { prisma, runWithRetry } from "@/lib/db";
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

    // The whole read-validate-write sequence runs inside one Serializable
    // transaction so a concurrent webhook payment update or a duplicate
    // refund submission racing this request can't apply a refund computed
    // from stale paidAmount/paymentStatus -- Postgres aborts one of the two
    // conflicting transactions and runWithRetry retries it against fresh data.
    const result = await runWithRetry(() =>
      prisma.$transaction(async (rawTx) => {
        const tx = rawTx as unknown as PrismaClient;

        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          include: {
            experience: { select: { title: true } },
            slot: true,
            user: { select: { name: true, email: true } },
          },
        });

        if (!booking) {
          throw new Error("BOOKING_NOT_FOUND");
        }
        if (booking.paymentStatus !== "REFUND_PENDING") {
          throw new Error("REFUND_NOT_PENDING");
        }

        const storedRefundAmt = booking.refundAmount != null
          ? Number(booking.refundAmount)
          : Number(booking.paidAmount);
        const refundAmt = refundAmount ?? storedRefundAmt;

        if (refundAmt < 0) {
          throw new Error("REFUND_ERROR: Refund amount cannot be negative.");
        }

        // Use the pre-stored refundAmount as a cap fallback when paidAmount is 0.
        // The refundAmount on the booking was already validated during cancellation,
        // so it can be trusted as the effective paid cap in partial-cancel scenarios.
        const effectivePaidCap = booking.refundAmount
          ? Math.max(Number(booking.paidAmount), Number(booking.refundAmount))
          : Number(booking.paidAmount);

        if (refundAmt > effectivePaidCap) {
          throw new Error(`REFUND_ERROR: Refund amount (₹${refundAmt}) cannot exceed the paid amount (₹${effectivePaidCap}).`);
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

        // Update any associated RefundRequest to COMPLETED
        if (tx.refundRequest) {
          await tx.refundRequest.updateMany({
            where: { bookingId, status: { not: "COMPLETED" } },
            data: {
              status: "COMPLETED",
              approvedAt: new Date(),
              processedAt: new Date(),
              remarks: booking.refundPreference === "COUPON" ? `Coupon refund resolved: ${couponCode}` : `Bank refund resolved: ${couponCode}`,
              utrNumber: couponCode,
            },
          });
        }

        return { booking, refundAmt, couponCode };
      }, { isolationLevel: "Serializable" }),
    );

    const { booking, refundAmt, couponCode } = result;

    await logActivity("REFUND_RESOLVED", adminId, "Booking", bookingId, {
      refundNote: couponCode,
      refundPreference: booking.refundPreference,
      refundAmount: refundAmt,
    });

    // The refund itself already committed above -- a failure sending this
    // notification email must not surface as a failed-refund error to the
    // admin, who would otherwise retry and risk a double refund.
    try {
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
    } catch (emailError) {
      console.error("Failed to send refund-resolved email:", emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message === "BOOKING_NOT_FOUND") {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
    if (message === "REFUND_NOT_PENDING") {
      return NextResponse.json({ error: "Booking is not awaiting a refund." }, { status: 409 });
    }
    if (message.startsWith("REFUND_ERROR: ")) {
      return NextResponse.json({ error: message.replace("REFUND_ERROR: ", "") }, { status: 400 });
    }
    console.error("Refund resolution error:", error);
    return NextResponse.json(
      { error: "Failed to resolve refund." },
      { status: 500 }
    );
  }
}
