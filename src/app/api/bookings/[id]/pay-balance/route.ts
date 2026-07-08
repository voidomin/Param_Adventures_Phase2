import { NextRequest, NextResponse } from "next/server";
import { prisma, runWithRetry } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { getRazorpay } from "@/lib/razorpay";
import { BookingRepo } from "@/repositories/booking.repo";
import { logActivity } from "@/lib/audit-logger";
import { isExpiredIST } from "@/lib/coupon-engine";
import { CouponStatus } from "@prisma/client";

interface CouponInput {
  customerId: string;
  status: string;
  expiryDate: string | Date | null;
  balance: unknown;
}

function checkCouponValidity(coupon: CouponInput | null, userId: string) {
  if (!coupon) throw new Error("COUPON_ERROR: Invalid coupon code.");
  if (coupon.customerId !== userId) throw new Error("COUPON_ERROR: Coupon belongs to another customer.");
  if (coupon.status === "EXPIRED" || isExpiredIST(coupon.expiryDate ?? "")) {
    throw new Error("COUPON_ERROR: Coupon has expired.");
  }
  if (coupon.status === "FULLY_USED" || Number(coupon.balance) <= 0) {
    throw new Error("COUPON_ERROR: Coupon has no balance left.");
  }
  if (coupon.status === "BLOCKED" || coupon.status === "CANCELLED") {
    throw new Error(`COUPON_ERROR: Coupon is ${coupon.status.toLowerCase()}.`);
  }
}

async function validateAndCalculateCoupons(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  appliedCoupons: string[],
  userId: string,
  initialRemaining: number
) {
  let remaining = initialRemaining;
  let totalCouponRedeemed = 0;
  const redemptionsList: { couponId: string; amount: number }[] = [];

  for (const code of appliedCoupons) {
    if (remaining <= 0.01) break;

    const dbCoupon = await tx.travelCoupon.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    checkCouponValidity(dbCoupon, userId);

    if (remaining < Number(dbCoupon!.balance)) {
      throw new Error(`COUPON_ERROR: Coupon value exceeds the booking/payment amount.`);
    }

    const redeemAmount = Number(dbCoupon!.balance);
    const nextRemaining = Math.round((remaining - redeemAmount) * 100) / 100;
    if (nextRemaining > 0 && nextRemaining < 1) {
      throw new Error(`COUPON_ERROR: Applying this coupon would leave a balance of ₹${nextRemaining}, which is below the minimum online payment of ₹1.00.`);
    }
    remaining = nextRemaining;
    totalCouponRedeemed += redeemAmount;
    redemptionsList.push({ couponId: dbCoupon!.id, amount: redeemAmount });
  }

  return { remaining, totalCouponRedeemed, redemptionsList };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  const { id: bookingId } = await params;
  const userId = auth.userId;

  try {
    const body = await request.json().catch(() => ({}));
    const appliedCoupons: string[] = body.appliedCoupons || [];

    // Fetch booking outside transaction first to check basic validity
    const initialBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { userId: true, bookingStatus: true, remainingBalance: true }
    });

    if (!initialBooking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
    if (initialBooking.userId !== userId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    if (initialBooking.bookingStatus === "CANCELLED") {
      return NextResponse.json({ error: "Booking is cancelled." }, { status: 400 });
    }
    if (Number(initialBooking.remainingBalance) <= 0.01) {
      return NextResponse.json({ error: "Booking is already fully paid." }, { status: 400 });
    }

    const transactionResult = await runWithRetry(() =>
      prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          include: { experience: { select: { title: true } } }
        });

        if (!booking) throw new Error("BOOKING_NOT_FOUND");

        const { remaining, totalCouponRedeemed, redemptionsList } = await validateAndCalculateCoupons(
          tx,
          appliedCoupons,
          userId,
          Number(booking.remainingBalance)
        );

        // Apply coupon redemptions
        for (const red of redemptionsList) {
          const c = await tx.travelCoupon.findUnique({ where: { id: red.couponId } });
          if (!c) throw new Error("Coupon not found.");
          const curBal = Number(c.balance);
          const newBal = Math.max(0, curBal - red.amount);
          const newStatus = newBal === 0 ? "FULLY_USED" : "PARTIALLY_USED";

          await tx.travelCoupon.update({
            where: { id: red.couponId },
            data: { balance: newBal, status: newStatus as CouponStatus },
          });

          await tx.couponTransaction.create({
            data: {
              couponId: red.couponId,
              bookingId: booking.id,
              type: "REDEEMED",
              amount: red.amount,
              previousBalance: curBal,
              newBalance: newBal,
              remarks: `Redeemed on balance payment for booking ${booking.id.substring(0, 8)}...`,
            },
          });
        }

        // Update booking records with coupon application
        const newRemaining = remaining;
        const newPaidAmount = Number(booking.paidAmount) + totalCouponRedeemed;
        const isFullyPaid = newRemaining <= 0.01;

        let finalBookingStatus = booking.bookingStatus;
        let finalPaymentStatus = booking.paymentStatus;
        if (isFullyPaid) {
          finalPaymentStatus = "PAID";
          finalBookingStatus = "CONFIRMED";
        } else if (newPaidAmount > 0.01) {
          finalPaymentStatus = "PARTIALLY_PAID";
        }

        const updatedBooking = await tx.booking.update({
          where: { id: bookingId },
          data: {
            paidAmount: newPaidAmount,
            remainingBalance: newRemaining,
            paymentStatus: finalPaymentStatus,
            bookingStatus: finalBookingStatus,
          },
        });

        // If fully paid, create payment log and clean up
        if (newRemaining <= 0.01) {
          await tx.payment.create({
            data: {
              bookingId: booking.id,
              provider: "MANUAL",
              providerPaymentId: "COUPON_PAID",
              amount: totalCouponRedeemed,
              currency: "INR",
              status: "PAID",
            }
          });

          await tx.payment.deleteMany({
            where: { bookingId: booking.id, status: "PENDING" }
          });

          return { updatedBooking, fullyPaid: true, remaining: 0, totalCouponRedeemed };
        }

        return { updatedBooking, fullyPaid: false, remaining: newRemaining, totalCouponRedeemed };
      }, {
        isolationLevel: "Serializable"
      })
    );

    if (transactionResult.fullyPaid) {
      await logActivity("BOOKING_BALANCE_PAID_BY_COUPON", userId, "Booking", bookingId, {
        totalCouponRedeemed: transactionResult.totalCouponRedeemed,
      });

      return NextResponse.json({
        success: true,
        bookingId,
        fullyPaidByCoupon: true,
      });
    }

    // Razorpay flow for remaining balance amount
    const remainingToCharge = transactionResult.remaining ?? 0;
    
    const payment = await prisma.payment.create({
      data: {
        bookingId: bookingId,
        provider: "RAZORPAY",
        providerOrderId: "PENDING_AUTH",
        amount: remainingToCharge,
        currency: "INR",
        status: "PENDING",
      }
    });

    const razorpay = await getRazorpay();
    const amountPaise = Math.round(remainingToCharge * 100);

    const keyIdSetting = await BookingRepo.getRazorpayKeyId(prisma);
    const keyId = keyIdSetting?.value || process.env.RAZORPAY_KEY_ID;

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: bookingId,
      notes: {
        bookingId: bookingId,
        experienceId: transactionResult.updatedBooking.experienceId,
        userId,
        paymentId: payment.id,
        purpose: "BALANCE_PAYMENT",
      },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerOrderId: order.id }
    });

    await logActivity("BOOKING_BALANCE_PAYMENT_REQUESTED", userId, "Booking", bookingId, {
      orderId: order.id,
      amount: remainingToCharge,
    });

    return NextResponse.json({
      bookingId: bookingId,
      orderId: order.id,
      amount: amountPaise,
      currency: "INR",
      keyId,
    });

  } catch (error: unknown) {
    console.error("Booking balance payment error:", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg.startsWith("COUPON_ERROR:")) {
      return NextResponse.json({ error: msg.replace("COUPON_ERROR: ", "") }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to initiate balance payment." },
      { status: 500 }
    );
  }
}
