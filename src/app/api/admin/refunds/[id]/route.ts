import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { sendRefundResolved } from "@/lib/email";
import { RefundStatus } from "@prisma/client";

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

    const refundRequest = await prisma.refundRequest.findUnique({
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
      return NextResponse.json({ error: "Refund request not found." }, { status: 404 });
    }

    const booking = refundRequest.booking;

    // Build update payload for RefundRequest
    const refundUpdateData: any = {
      status: status as RefundStatus,
      remarks: remarks !== undefined ? remarks : refundRequest.remarks,
      utrNumber: utrNumber !== undefined ? utrNumber : refundRequest.utrNumber,
    };

    if (status === "APPROVED" && !refundRequest.approvedAt) {
      refundUpdateData.approvedAt = new Date();
    }
    if (status === "COMPLETED" && !refundRequest.processedAt) {
      refundUpdateData.processedAt = new Date();
    }

    // Atomic transaction for completing refund
    await prisma.$transaction(async (tx) => {
      // 1. Update the RefundRequest record
      await tx.refundRequest.update({
        where: { id: refundId },
        data: refundUpdateData,
      });

      // 2. If status is COMPLETED, update the parent booking totals and payment status
      if (status === "COMPLETED") {
        const refundAmt = Number(refundRequest.finalRefundAmount);
        const newPaidAmount = Math.max(0, Number(booking.paidAmount) - refundAmt);
        const remainingBalance = Number(booking.totalPrice) - newPaidAmount;

        let newPaymentStatus: "REFUNDED" | "PARTIALLY_PAID" | "PAID" = "PAID";
        if (booking.bookingStatus === "CANCELLED") {
          newPaymentStatus = "REFUNDED";
        } else if (remainingBalance > 0.01) {
          newPaymentStatus = "PARTIALLY_PAID";
        }

        await tx.booking.update({
          where: { id: booking.id },
          data: {
            paymentStatus: newPaymentStatus,
            paidAmount: newPaidAmount,
            remainingBalance: Math.max(0, remainingBalance),
            refundNote: utrNumber || remarks || "Bank Transfer Refund Completed",
            refundAmount: null, // Clear transient refund field as it's fully settled
          },
        });
      }
    });

    // Audit logs & email on COMPLETED
    if (status === "COMPLETED") {
      await logActivity("REFUND_RESOLVED", adminId, "Booking", booking.id, {
        refundNote: utrNumber || remarks || "Bank Transfer Refund Completed",
        refundPreference: "BANK_REFUND",
        refundAmount: Number(refundRequest.finalRefundAmount),
        utrNumber,
      });

      try {
        await sendRefundResolved({
          userName: booking.user.name || "Adventurer",
          userEmail: booking.user.email,
          experienceTitle: booking.experience.title,
          slotDate: booking.slot?.date?.toISOString() ?? new Date().toISOString(),
          refundPreference: "BANK_REFUND",
          refundNote: utrNumber || remarks || "Processed successfully via Bank Transfer",
          totalPrice: Number(refundRequest.finalRefundAmount),
        });
      } catch (emailErr) {
        console.error("[RefundAPI] Failed to send email confirmation:", emailErr);
      }
    } else {
      await logActivity("REFUND_STATUS_UPDATED", adminId, "RefundRequest", refundId, {
        status,
        remarks,
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Update refund error:", error);
    return NextResponse.json({ error: "Failed to update refund request." }, { status: 500 });
  }
}
