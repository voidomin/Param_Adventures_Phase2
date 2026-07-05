import { prisma } from "@/lib/db";

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

/**
 * Resolves the applicable cancellation refund percentage based on days before departure.
 * Reads tiers from PlatformSetting `cancellation_policy_rules`.
 */
export async function getRefundPercentage(
  departureDate: Date,
  cancellationDate: Date = new Date()
): Promise<{ refundPercent: number; daysBefore: number }> {
  const timeDiff = departureDate.getTime() - cancellationDate.getTime();
  const daysBefore = timeDiff / (1000 * 60 * 60 * 24);

  if (daysBefore < 0) {
    return { refundPercent: 0, daysBefore };
  }

  // Default fallback rules
  let rules: PolicyTier[] = [
    { minDays: 30, maxDays: null, refundPercent: 100 },
    { minDays: 15, maxDays: 29, refundPercent: 75 },
    { minDays: 7, maxDays: 14, refundPercent: 50 },
    { minDays: 3, maxDays: 6, refundPercent: 25 },
    { minDays: 0, maxDays: 2, refundPercent: 0 }
  ];

  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: "cancellation_policy_rules" }
    });
    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed)) {
        rules = parsed;
      }
    }
  } catch (e) {
    console.error("[RefundEngine] Error loading cancellation rules, using defaults:", e);
  }

  // Sort descending by minDays to ensure we match the largest window first
  const sortedRules = [...rules].sort((a, b) => b.minDays - a.minDays);

  for (const rule of sortedRules) {
    if (daysBefore >= rule.minDays) {
      return { refundPercent: rule.refundPercent, daysBefore };
    }
  }

  return { refundPercent: 0, daysBefore };
}

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
    gst = taxBreakdown.reduce((sum, item: any) => sum + (Number(item.amount) || 0), 0);
  }
  gst = Math.round(gst);

  // Convenience Fee is the remainder (totalPrice - baseFare - gst)
  const convenienceFee = Math.max(0, Math.round(totalPrice - (baseFare + gst)));

  if (isCompanyCancellation) {
    // Scenario 7: Company cancels -> 100% refund of whatever was paid (Base Fare + GST + Convenience Fee)
    return {
      baseFare: Math.round(baseFare),
      gst,
      convenienceFee,
      cancellationPercent: 0,
      cancellationCharges: 0,
      finalRefundAmount: Math.round(paidAmount),
    };
  }

  const cancellationPercent = 100 - refundPercent;
  const cancellationCharges = Math.round((baseFare * cancellationPercent) / 100);
  const refundableBaseFare = Math.max(0, baseFare - cancellationCharges);

  // Treat as FULL payment if they paid the complete amount (totalPrice) even if paymentType is ADVANCE.
  const isEffectiveFullPayment = paymentType === "FULL" || Number(paidAmount) >= Number(totalPrice) - 0.1;

  let finalRefundAmount = 0;
  if (!isEffectiveFullPayment) {
    // Scenario 6: Partial / Advance payment -> seat block only, no GST/conv fee charged by company.
    if (refundPercent === 100) {
      finalRefundAmount = paidAmount;
    } else {
      // Deduct cancellation charges directly from the paid advance amount
      finalRefundAmount = Math.max(0, paidAmount - cancellationCharges);
    }
  } else {
    if (refundPreference === "COUPON") {
      // Coupon Refund -> GST and Convenience Fee are refunded. Only deduct cancellation charges.
      finalRefundAmount = Math.max(0, paidAmount - cancellationCharges);
    } else {
      // Regular / Full payment -> GST and Conv Fee are non-refundable. Only base fare minus cancellation charges.
      finalRefundAmount = Math.min(refundableBaseFare, paidAmount);
    }
  }

  return {
    baseFare: Math.round(baseFare),
    gst,
    convenienceFee,
    cancellationPercent,
    cancellationCharges,
    finalRefundAmount: Math.round(finalRefundAmount),
  };
}
