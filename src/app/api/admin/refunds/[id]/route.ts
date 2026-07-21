import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { sendRefundResolved } from "@/lib/email";
import { RefundStatus } from "@prisma/client";
import { generateCouponCode } from "@/lib/coupon-engine";

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
    const refundUpdateData: Record<string, unknown> = {
      status: status as RefundStatus,
      remarks: remarks !== undefined ? remarks : refundRequest.remarks,
      utrNumber: utrNumber !== undefined ? utrNumber : refundRequest.utrNumber,
    };

    const isCompleted = status === "COMPLETED" || status === "TRANSFER_COMPLETED";

    if (status === "APPROVED" && !refundRequest.approvedAt) {
      refundUpdateData.approvedAt = new Date();
    }
    if (isCompleted && !refundRequest.processedAt) {
      refundUpdateData.processedAt = new Date();
    }

    let couponCode = "";

    // Atomic transaction for completing refund
    await prisma.$transaction(async (tx) => {
      // 1. Update the RefundRequest record
      await tx.refundRequest.update({
        where: { id: refundId },
        data: refundUpdateData,
      });

      // 2. If status is completed, update the parent booking totals and payment status
      if (isCompleted) {
        const refundAmt = Number(refundRequest.finalRefundAmount);
        const newPaidAmount = Math.max(0, Number(booking.paidAmount) - refundAmt);
        const remainingBalance = Number(booking.totalPrice) - newPaidAmount;

        let newPaymentStatus: "REFUNDED" | "PARTIALLY_PAID" | "PAID" = "PAID";
        if (booking.bookingStatus === "CANCELLED") {
          newPaymentStatus = "REFUNDED";
        } else if (remainingBalance > 0.01) {
          newPaymentStatus = "PARTIALLY_PAID";
        }

        if (refundRequest.refundMethod === "TRAVEL_COUPON") {
          couponCode = generateCouponCode("PARAM");
          const expiry = new Date();
          expiry.setMonth(expiry.getMonth() + 12);

          const newCoupon = await tx.travelCoupon.create({
            data: {
              code: couponCode,
              customerId: booking.userId,
              bookingId: booking.id,
              originalValue: refundAmt,
              balance: refundAmt,
              expiryDate: expiry,
              status: "ACTIVE",
              type: "CANCELLATION",
              reason: `Refund for cancelled booking ${booking.id.substring(0, 8)}`,
              issuedById: adminId,
            },
          });

          await tx.couponTransaction.create({
            data: {
              couponId: newCoupon.id,
              bookingId: booking.id,
              type: "ISSUED",
              amount: refundAmt,
              previousBalance: 0,
              newBalance: refundAmt,
              remarks: `Issued Travel Coupon refund for booking ${booking.id.substring(0, 8)}`,
            },
          });
        } else {
          couponCode = utrNumber || remarks || "Bank Transfer Refund Completed";
        }

        await tx.booking.update({
          where: { id: booking.id },
          data: {
            paymentStatus: newPaymentStatus,
            paidAmount: newPaidAmount,
            remainingBalance: Math.max(0, remainingBalance),
            refundNote: couponCode,
            refundAmount: null, // Clear transient refund field as it's fully settled
          },
        });
      }
    });

    // Audit logs & email on completed
    if (isCompleted) {
      const isCoupon = refundRequest.refundMethod === "TRAVEL_COUPON";
      await logActivity("REFUND_RESOLVED", adminId, "Booking", booking.id, {
        refundNote: couponCode,
        refundPreference: isCoupon ? "COUPON" : "BANK_REFUND",
        refundAmount: Number(refundRequest.finalRefundAmount),
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
