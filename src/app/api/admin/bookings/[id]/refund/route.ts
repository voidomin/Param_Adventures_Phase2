import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { prisma, runWithRetry } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { sendRefundResolved } from "@/lib/email";
import { z } from "zod";

import { issueCancellationCoupon } from "@/lib/coupon-engine";
import { issueCreditNote } from "@/lib/invoice-numbering";

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
          couponCode = await issueCancellationCoupon(tx, {
            bookingId,
            customerId: booking.userId,
            amount: refundAmt,
            issuedById: adminId,
            reason: `Refund for cancelled booking ${bookingId.substring(0, 8)}`,
          });
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

        // A booking's individual Payment rows (each charge attempt --
        // Razorpay, manual bank-transfer verification, coupon settlement)
        // are written PAID at collection time and never revisited. Once the
        // booking itself is fully REFUNDED, those rows are stale: they'd
        // otherwise say PAID forever with nothing on the payment record
        // itself showing the money went back. Only applies to a full
        // refund -- a partial refund still legitimately kept some of what
        // was collected, so there's no single row to flip to REFUNDED.
        if (newPaymentStatus === "REFUNDED") {
          await tx.payment.updateMany({
            where: { bookingId, status: "PAID" },
            data: { status: "REFUNDED" },
          });
        }

        // Real money (or coupon credit) is being handed back against a
        // previously invoiced booking -- GST requires a credit note for
        // that, referencing the original invoice, in its own sequential
        // series (see lib/invoice-numbering.ts). Every dollar amount here
        // was already validated above (capped at what was actually paid),
        // so this only fires for a genuine refund, never speculatively.
        const creditNoteNumber = refundAmt > 0
          ? await issueCreditNote(tx, {
              bookingId,
              amount: refundAmt,
              reason: booking.cancellationReason || "Booking cancellation/refund",
            })
          : null;

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

        return { booking, refundAmt, couponCode, creditNoteNumber };
      }, { isolationLevel: "Serializable" }),
    );

    const { booking, refundAmt, couponCode, creditNoteNumber } = result;

    await logActivity("REFUND_RESOLVED", adminId, "Booking", bookingId, {
      refundNote: couponCode,
      refundPreference: booking.refundPreference,
      refundAmount: refundAmt,
      creditNoteNumber,
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
        creditNoteNumber,
      });
    } catch (emailError) {
      console.error("Failed to send refund-resolved email:", emailError);
    }

    return NextResponse.json({ success: true, creditNoteNumber });
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
