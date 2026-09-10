import { prisma } from "@/lib/db";
import { CancellationPolicyGroup } from "@prisma/client";

export interface RefundBreakdown {
  baseFare: number;
  gst: number;
  convenienceFee: number;
  cancellationPercent: number;
  cancellationCharges: number;
  finalRefundAmount: number;
}

export interface PolicyTier {
  minDays: number;
  maxDays: number | null;
  refundPercent: number;
}

// Fallback tiers per trek-length group, used until an admin configures
// their own via Settings -> Finance. Derived from this project's own
// published cancellation policy (src/app/refunds/page.tsx), inverting its
// "cancellation charge %" into the refund % this engine actually works in.
const DEFAULT_POLICY_TIERS: Record<CancellationPolicyGroup, PolicyTier[]> = {
  SHORT_TRIP: [
    { minDays: 21, maxDays: null, refundPercent: 100 },
    { minDays: 16, maxDays: 20, refundPercent: 75 },
    { minDays: 6, maxDays: 15, refundPercent: 50 },
    { minDays: 0, maxDays: 5, refundPercent: 0 },
  ],
  MULTI_DAY: [
    { minDays: 46, maxDays: null, refundPercent: 100 },
    { minDays: 31, maxDays: 45, refundPercent: 50 },
    { minDays: 21, maxDays: 30, refundPercent: 25 },
    { minDays: 0, maxDays: 20, refundPercent: 0 },
  ],
  INTERNATIONAL: [
    { minDays: 61, maxDays: null, refundPercent: 100 },
    { minDays: 46, maxDays: 60, refundPercent: 50 },
    { minDays: 31, maxDays: 45, refundPercent: 25 },
    { minDays: 0, maxDays: 30, refundPercent: 0 },
  ],
};

/**
 * Resolves the tier list actually in effect for a trek-length group --
 * whatever an admin configured in Settings -> Finance, or this group's
 * hardcoded default if nothing's configured yet. Sorted descending by
 * minDays, so the caller can just take the first tier whose minDays a
 * given day-count satisfies.
 *
 * This is the single source of truth for "what tiers apply to group X" --
 * used both by getRefundPercentage below (to actually calculate a refund)
 * and by the public /refunds page (to publish the same numbers customers
 * would actually get), so the two can never drift apart again.
 */
export async function getPolicyTiersForGroup(policyGroup: CancellationPolicyGroup): Promise<PolicyTier[]> {
  let rules: PolicyTier[] = DEFAULT_POLICY_TIERS[policyGroup];

  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: "cancellation_policy_rules" }
    });
    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      const groupRules = parsed?.[policyGroup];
      if (Array.isArray(groupRules)) {
        rules = groupRules;
      }
    }
  } catch (e) {
    console.error("[RefundEngine] Error loading cancellation rules, using defaults:", e);
  }

  return [...rules].sort((a, b) => b.minDays - a.minDays);
}

/**
 * Resolves the applicable cancellation refund percentage based on days
 * before departure and the experience's trek-length group.
 */
export async function getRefundPercentage(
  departureDate: Date,
  cancellationDate: Date = new Date(),
  policyGroup: CancellationPolicyGroup
): Promise<{ refundPercent: number; daysBefore: number }> {
  const timeDiff = departureDate.getTime() - cancellationDate.getTime();
  const daysBefore = timeDiff / (1000 * 60 * 60 * 24);

  if (daysBefore < 0) {
    return { refundPercent: 0, daysBefore };
  }

  const sortedRules = await getPolicyTiersForGroup(policyGroup);

  for (const rule of sortedRules) {
    if (daysBefore >= rule.minDays) {
      return { refundPercent: rule.refundPercent, daysBefore };
    }
  }

  return { refundPercent: 0, daysBefore };
}

export const round2 = (num: number) => Number(num.toFixed(2));

/**
 * Calculates the exact refund breakdown following Param Adventures business rules.
 */
export function calculateRefundBreakdown(params: {
  baseFare: number;
  totalPrice: number;
  paidAmount: number;
  paymentType: "FULL" | "ADVANCE";
  refundPercent: number;
  taxBreakdown: unknown;
  isCompanyCancellation?: boolean;
  refundPreference?: "COUPON" | "BANK_REFUND" | null;
}): RefundBreakdown {
  const {
    baseFare,
    totalPrice,
    paidAmount,
    paymentType,
    refundPercent,
    taxBreakdown,
    isCompanyCancellation = false,
    refundPreference = null,
  } = params;

  // Calculate GST from taxBreakdown
  let gst = 0;
  if (Array.isArray(taxBreakdown)) {
    gst = taxBreakdown.reduce((sum, item: { amount: unknown }) => sum + (Number(item.amount) || 0), 0);
  }
  gst = round2(gst);

  // Convenience Fee is the remainder (totalPrice - baseFare - gst)
  const convenienceFee = Math.max(0, round2(totalPrice - (baseFare + gst)));

  if (isCompanyCancellation) {
    // Scenario 7: Company cancels -> 100% refund of whatever was paid (Base Fare + GST + Convenience Fee)
    return {
      baseFare: round2(baseFare),
      gst,
      convenienceFee,
      cancellationPercent: 0,
      cancellationCharges: 0,
      finalRefundAmount: round2(paidAmount),
    };
  }

  // At the 0%-refund tier, nothing comes back regardless of payout
  // method. Without this, the coupon branch below would still hand back
  // the GST + convenience fee portion even on a last-minute cancellation
  // (it only deducts cancellation charges from the base fare, not from
  // the tax/fee), which doesn't match the plain "no refund in this
  // window" a customer sees stated in the cancellation policy -- a bank
  // refund and a coupon at the same last-minute timing should mean the
  // same thing.
  if (refundPercent === 0) {
    return {
      baseFare: round2(baseFare),
      gst,
      convenienceFee,
      cancellationPercent: 100,
      cancellationCharges: round2(baseFare),
      finalRefundAmount: 0,
    };
  }

  const cancellationPercent = 100 - refundPercent;
  const cancellationCharges = round2((baseFare * cancellationPercent) / 100);
  const refundableBaseFare = Math.max(0, baseFare - cancellationCharges);

  // Treat as FULL payment if they paid the complete amount (totalPrice) even if paymentType is ADVANCE.
  const isEffectiveFullPayment = paymentType === "FULL" || Number(paidAmount) >= Number(totalPrice) - 0.1;

  let finalRefundAmount = 0;
  if (isEffectiveFullPayment && refundPreference === "COUPON") {
    // Coupon Refund -> GST and Convenience Fee are refunded. Only deduct cancellation charges.
    finalRefundAmount = Math.max(0, paidAmount - cancellationCharges);
  } else if (isEffectiveFullPayment) {
    // Regular / Full payment -> GST and Conv Fee are non-refundable. Only base fare minus cancellation charges.
    finalRefundAmount = Math.min(refundableBaseFare, paidAmount);
  } else if (refundPercent === 100) {
    // Scenario 6: Partial / Advance payment -> seat block only, no GST/conv fee charged by company.
    finalRefundAmount = paidAmount;
  } else {
    // Deduct cancellation charges directly from the paid advance amount
    finalRefundAmount = Math.max(0, paidAmount - cancellationCharges);
  }

  return {
    baseFare: round2(baseFare),
    gst,
    convenienceFee,
    cancellationPercent,
    cancellationCharges,
    finalRefundAmount: round2(finalRefundAmount),
  };
}

/**
 * Creates the RefundRequest row for a cancellation breakdown -- always
 * REQUESTED, never disbursed here. Shared by every cancellation path
 * (full/partial, user-initiated/admin-initiated) so the
 * breakdown-field-to-RefundRequest-field mapping exists in exactly one place.
 */
export async function createRefundRequestForBreakdown(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  params: {
    bookingId: string;
    customerId: string;
    // NO_REFUND is accepted because a refund request can now exist purely
    // to hold a pending coupon-restore amount (couponRestoreAmount below)
    // even when the customer/admin declined a cash refund -- refundMethod
    // is meaningless in that case and just defaults to BANK_TRANSFER.
    preference: "COUPON" | "BANK_REFUND" | "NO_REFUND";
    breakdown: RefundBreakdown;
    // Balance owed back to a previously-redeemed coupon on this booking,
    // pending the same admin approval as the cash refund -- see
    // restoreCouponsForBooking's dryRun mode in coupon-engine.ts.
    couponRestoreAmount?: number;
  }
): Promise<void> {
  const { bookingId, customerId, preference, breakdown, couponRestoreAmount = 0 } = params;
  await tx.refundRequest.create({
    data: {
      bookingId,
      customerId,
      refundMethod: preference === "COUPON" ? "TRAVEL_COUPON" : "BANK_TRANSFER",
      baseFare: breakdown.baseFare,
      gst: breakdown.gst,
      convenienceFee: breakdown.convenienceFee,
      cancellationPercent: breakdown.cancellationPercent,
      cancellationCharges: breakdown.cancellationCharges,
      finalRefundAmount: breakdown.finalRefundAmount,
      couponRestoreAmount,
      status: "REQUESTED",
    },
  });
}
