import { prisma } from "@/lib/db";
import { CouponStatus, TravelCoupon } from "@prisma/client";

/**
 * Checks if the current time is past the end of the expiry day in Indian Standard Time (IST, UTC+5.5).
 */
export function isExpiredIST(expiryDate: Date | string): boolean {
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) return true;

  const expiryYear = expiry.getUTCFullYear();
  const expiryMonth = expiry.getUTCMonth();
  const expiryDay = expiry.getUTCDate();

  const endOfExpiryDayIST = new Date(Date.UTC(expiryYear, expiryMonth, expiryDay, 18, 29, 59, 999));

  return new Date() > endOfExpiryDayIST;
}

/**
 * Validates a coupon code against business criteria.
 */
export async function validateCoupon(
  code: string,
  customerId: string
): Promise<{ coupon: TravelCoupon; error?: string }> {
  try {
    const coupon = await prisma.travelCoupon.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!coupon) {
      return { coupon: null as any, error: "Invalid coupon code." };
    }

    if (coupon.customerId !== customerId) {
      return { coupon, error: "This coupon belongs to another customer." };
    }

    if (coupon.status === CouponStatus.EXPIRED || isExpiredIST(coupon.expiryDate)) {
      // Auto-update status to EXPIRED if date passed
      if (coupon.status !== CouponStatus.EXPIRED) {
        await prisma.travelCoupon.update({
          where: { id: coupon.id },
          data: { status: CouponStatus.EXPIRED },
        });
      }
      return { coupon, error: "This coupon has expired." };
    }

    if (coupon.status === CouponStatus.FULLY_USED || Number(coupon.balance) <= 0) {
      return { coupon, error: "This coupon has already been fully redeemed." };
    }

    if (coupon.status === CouponStatus.BLOCKED || coupon.status === CouponStatus.CANCELLED) {
      return { coupon, error: `This coupon is currently ${coupon.status.toLowerCase()}.` };
    }

    return { coupon };
  } catch (err) {
    console.error("[CouponEngine] Error validating coupon:", err);
    return { coupon: null as any, error: "Failed to validate coupon." };
  }
}

/**
 * Redeems an amount from a coupon in a transaction.
 */
export async function redeemCoupon(params: {
  couponId: string;
  bookingId: string;
  amount: number;
  tx: any;
}): Promise<void> {
  const { couponId, bookingId, amount, tx } = params;

  const coupon = await tx.travelCoupon.findUnique({
    where: { id: couponId },
  });

  if (!coupon) throw new Error("Coupon not found during redemption.");

  const currentBalance = Number(coupon.balance);
  if (currentBalance < amount) {
    throw new Error("Insufficient coupon balance.");
  }

  const newBalance = Math.max(0, currentBalance - amount);
  const newStatus = newBalance === 0 ? CouponStatus.FULLY_USED : CouponStatus.PARTIALLY_USED;

  await tx.travelCoupon.update({
    where: { id: couponId },
    data: {
      balance: newBalance,
      status: newStatus,
    },
  });

  await tx.couponTransaction.create({
    data: {
      couponId,
      bookingId,
      type: "REDEEMED",
      amount,
      previousBalance: currentBalance,
      newBalance,
      remarks: `Redeemed on booking ${bookingId.substring(0, 8)}...`,
    },
  });
}

/**
 * Restores any coupon values redeemed on a booking, respecting cancellation policy.
 */
export async function restoreCouponsForBooking(params: {
  bookingId: string;
  cancellationCharges: number;
  tx: any;
}): Promise<{ totalRestored: number }> {
  const { bookingId, cancellationCharges, tx } = params;

  // Find all REDEEMED transactions for this booking
  const redemptions = await tx.couponTransaction.findMany({
    where: {
      bookingId,
      type: "REDEEMED",
    },
    include: {
      coupon: true,
    },
  });

  let remainingChargeToApply = cancellationCharges;
  let totalRestored = 0;

  for (const r of redemptions) {
    const coupon = r.coupon;
    const redeemedAmount = Number(r.amount);

    // Scenario 6: Do not restore if coupon has expired
    if (isExpiredIST(coupon.expiryDate)) {
      // Keep transaction logs but don't restore balance
      await tx.couponTransaction.create({
        tx,
        data: {
          couponId: coupon.id,
          bookingId,
          type: "EXPIRED",
          amount: 0,
          previousBalance: coupon.balance,
          newBalance: coupon.balance,
          remarks: `Coupon was expired at cancellation time. Restoration skipped.`,
        },
      });
      continue;
    }

    // Determine how much of the cancellation charge falls on this coupon's share
    let restorationAmount = redeemedAmount;
    if (remainingChargeToApply > 0) {
      const deduction = Math.min(restorationAmount, remainingChargeToApply);
      restorationAmount -= deduction;
      remainingChargeToApply -= deduction;
    }

    if (restorationAmount > 0) {
      const currentBalance = Number(coupon.balance);
      const newBalance = Math.min(Number(coupon.originalValue), currentBalance + restorationAmount);
      const newStatus = newBalance === Number(coupon.originalValue) ? CouponStatus.ACTIVE : CouponStatus.PARTIALLY_USED;

      await tx.travelCoupon.update({
        where: { id: coupon.id },
        data: {
          balance: newBalance,
          status: newStatus,
        },
      });

      await tx.couponTransaction.create({
        data: {
          couponId: coupon.id,
          bookingId,
          type: "RESTORED",
          amount: restorationAmount,
          previousBalance: currentBalance,
          newBalance,
          remarks: `Restored ${restorationAmount} from cancelled booking ${bookingId.substring(0, 8)}...`,
        },
      });

      totalRestored += restorationAmount;
    }
  }

  return { totalRestored };
}

/**
 * Generates a unique, elegant coupon code.
 */
export function generateCouponCode(prefix = "PARAM"): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let random = "";
  for (let i = 0; i < 8; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${random}`;
}
