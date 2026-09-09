import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, RefundStatus, Prisma } from "@prisma/client";
import { prisma, runWithRetry } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { sendRefundResolved } from "@/lib/email";
import { logError } from "@/lib/monitoring";
import { applyRefundCompletion, RefundMethod } from "@/lib/refund-resolution";

type RefundRequestWithBooking = Prisma.RefundRequestGetPayload<{
  include: {
    booking: {
      include: {
        experience: { select: { title: true } };
        slot: { select: { date: true } };
        user: { select: { name: true; email: true } };
      };
    };
  };
}>;

const TERMINAL_STATUSES: RefundStatus[] = ["COMPLETED", "TRANSFER_COMPLETED"];

/**
 * Logs the resolution and emails the customer once a refund transaction has
 * committed. Email failures are swallowed -- the refund itself already succeeded.
 */
async function notifyRefundCompletion(
  refundRequest: RefundRequestWithBooking,
  adminId: string,
  couponCode: string,
  creditNoteNumber: string | null,
  utrNumber: string | undefined,
  remarks: string | undefined,
) {
  const booking = refundRequest.booking;
  const isCoupon = refundRequest.refundMethod === "TRAVEL_COUPON";

  await logActivity("REFUND_RESOLVED", adminId, "Booking", booking.id, {
    refundNote: couponCode,
    refundPreference: isCoupon ? "COUPON" : "BANK_REFUND",
    refundAmount: Number(refundRequest.finalRefundAmount),
    creditNoteNumber,
    utrNumber: isCoupon ? undefined : utrNumber,
  });

  try {
    await sendRefundResolved({
      userName: booking.user.name || "Adventurer",
      userEmail: booking.user.email,
      experienceTitle: booking.experience.title,
      slotDate: booking.slot?.date?.toISOString() ?? new Date().toISOString(),
      refundPreference: isCoupon ? "COUPON" : "BANK_REFUND",
      refundNote: isCoupon ? couponCode : (utrNumber || remarks || "Processed successfully via Bank Transfer"),
      totalPrice: Number(refundRequest.finalRefundAmount),
      bookingId: booking.id,
      creditNoteNumber,
    });
  } catch (emailErr) {
    console.error("[RefundAPI] Failed to send email confirmation:", emailErr);
  }
}

/**
 * PATCH /api/admin/refunds/[id]
 * Update a refund request status, logging UTR numbers and remarks, and finalizing bookings.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request, ["booking:cancel", "booking:moderate"]);
  if (!auth.authorized) return auth.response;

  const { id: refundId } = await params;
  const adminId = auth.userId;

  try {
    const body = await request.json();
    const { status, utrNumber, remarks } = body;

    if (!status || !Object.values(RefundStatus).includes(status as RefundStatus)) {
      return NextResponse.json({ error: "Invalid status value provided." }, { status: 400 });
    }

    const isCompleted = TERMINAL_STATUSES.includes(status as RefundStatus);

    // The whole read-validate-write sequence runs inside one Serializable
    // transaction, re-reading the refund request fresh rather than trusting
    // a pre-transaction snapshot -- a duplicate submission (double-click,
    // retry, two admin tabs) racing this request can't both apply the
    // payout: Postgres aborts one of the two conflicting transactions and
    // runWithRetry retries it against fresh data, where the idempotency
    // guard below then blocks it outright.
    const result = await runWithRetry(() =>
      prisma.$transaction(async (rawTx) => {
        const tx = rawTx as unknown as PrismaClient;

        const refundRequest = await tx.refundRequest.findUnique({
          where: { id: refundId },
          include: {
            booking: {
              include: {
                experience: { select: { title: true } },
                slot: { select: { date: true } },
                user: { select: { name: true, email: true } },
              },
            },
          },
        });

        if (!refundRequest) {
          throw new Error("REFUND_NOT_FOUND");
        }

        // Once a refund has already been resolved (coupon issued or bank
        // transfer recorded), re-applying it must be blocked outright --
        // otherwise a double-click, network retry, or two admin tabs open
        // on the same refund would silently issue a second coupon / deduct
        // paidAmount a second time.
        if (isCompleted && TERMINAL_STATUSES.includes(refundRequest.status)) {
          throw new Error("ALREADY_RESOLVED");
        }

        const refundUpdateData: Record<string, unknown> = {
          status: status as RefundStatus,
          remarks: remarks !== undefined ? remarks : refundRequest.remarks,
          utrNumber: utrNumber !== undefined ? utrNumber : refundRequest.utrNumber,
        };

        if (status === "APPROVED" && !refundRequest.approvedAt) {
          refundUpdateData.approvedAt = new Date();
        }
        if (isCompleted && !refundRequest.processedAt) {
          refundUpdateData.processedAt = new Date();
        }

        let couponCode = "";
        let creditNoteNumber: string | null = null;

        if (isCompleted) {
          const refundMethod: RefundMethod =
            refundRequest.refundMethod === "TRAVEL_COUPON" ? "TRAVEL_COUPON" : "BANK_TRANSFER";

          const applied = await applyRefundCompletion(tx, {
            booking: refundRequest.booking,
            refundAmount: Number(refundRequest.finalRefundAmount),
            refundMethod,
            bankReferenceNote: refundMethod === "BANK_TRANSFER" ? (utrNumber || remarks) : undefined,
            adminId,
          });
          couponCode = applied.couponCode;
          creditNoteNumber = applied.creditNoteNumber;
        }

        await tx.refundRequest.update({
          where: { id: refundId },
          data: refundUpdateData,
        });

        return { refundRequest, couponCode, creditNoteNumber };
      }, { isolationLevel: "Serializable" }),
    );

    const { refundRequest, couponCode, creditNoteNumber } = result;

    // Audit logs & email on completed
    if (isCompleted) {
      await notifyRefundCompletion(refundRequest, adminId, couponCode, creditNoteNumber, utrNumber, remarks);
    } else {
      await logActivity("REFUND_STATUS_UPDATED", adminId, "RefundRequest", refundId, {
        status,
        remarks,
      });
    }

    return NextResponse.json({ success: true, creditNoteNumber });

  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "REFUND_NOT_FOUND") {
      return NextResponse.json({ error: "Refund request not found." }, { status: 404 });
    }
    if (message === "ALREADY_RESOLVED") {
      return NextResponse.json({ error: "This refund has already been resolved." }, { status: 409 });
    }
    console.error("Update refund error:", error);
    await logError(error instanceof Error ? error : new Error(String(error)), {
      route: "PATCH /api/admin/refunds/[id]",
      requestId: request.headers?.get("x-request-id"),
    });
    return NextResponse.json({ error: "Failed to update refund request." }, { status: 500 });
  }
}
