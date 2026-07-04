import { describe, it, expect, vi } from "vitest";
import { calculateRefundBreakdown, getRefundPercentage } from "@/lib/refund-engine";
import { prisma } from "@/lib/db";

// Mock the prisma dependency
vi.mock("@/lib/db", () => ({
  prisma: {
    platformSetting: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Refund Calculation Engine Tests", () => {
  const taxBreakdown = [{ name: "GST", percentage: 5, amount: 500 }];

  it("Scenario 1: Full Refund Period (100% Refund)", () => {
    const breakdown = calculateRefundBreakdown({
      baseFare: 10000,
      totalPrice: 10600,
      paidAmount: 10600,
      paymentType: "FULL",
      refundPercent: 100,
      taxBreakdown,
    });

    expect(breakdown.baseFare).toBe(10000);
    expect(breakdown.gst).toBe(500);
    expect(breakdown.convenienceFee).toBe(100);
    expect(breakdown.cancellationCharges).toBe(0);
    expect(breakdown.cancellationPercent).toBe(0);
    expect(breakdown.finalRefundAmount).toBe(10000);
  });

  it("Scenario 2: 75% Refund Period", () => {
    const breakdown = calculateRefundBreakdown({
      baseFare: 10000,
      totalPrice: 10600,
      paidAmount: 10600,
      paymentType: "FULL",
      refundPercent: 75,
      taxBreakdown,
    });

    expect(breakdown.baseFare).toBe(10000);
    expect(breakdown.cancellationCharges).toBe(2500);
    expect(breakdown.cancellationPercent).toBe(25);
    expect(breakdown.finalRefundAmount).toBe(7500);
  });

  it("Scenario 3: 50% Refund Period", () => {
    const breakdown = calculateRefundBreakdown({
      baseFare: 10000,
      totalPrice: 10600,
      paidAmount: 10600,
      paymentType: "FULL",
      refundPercent: 50,
      taxBreakdown,
    });

    expect(breakdown.baseFare).toBe(10000);
    expect(breakdown.cancellationCharges).toBe(5000);
    expect(breakdown.cancellationPercent).toBe(50);
    expect(breakdown.finalRefundAmount).toBe(5000);
  });

  it("Scenario 4: 25% Refund Period", () => {
    const breakdown = calculateRefundBreakdown({
      baseFare: 10000,
      totalPrice: 10600,
      paidAmount: 10600,
      paymentType: "FULL",
      refundPercent: 25,
      taxBreakdown,
    });

    expect(breakdown.baseFare).toBe(10000);
    expect(breakdown.cancellationCharges).toBe(7500);
    expect(breakdown.cancellationPercent).toBe(75);
    expect(breakdown.finalRefundAmount).toBe(2500);
  });

  it("Scenario 5: No Refund (0%)", () => {
    const breakdown = calculateRefundBreakdown({
      baseFare: 10000,
      totalPrice: 10600,
      paidAmount: 10600,
      paymentType: "FULL",
      refundPercent: 0,
      taxBreakdown,
    });

    expect(breakdown.baseFare).toBe(10000);
    expect(breakdown.cancellationCharges).toBe(10000);
    expect(breakdown.cancellationPercent).toBe(100);
    expect(breakdown.finalRefundAmount).toBe(0);
  });

  it("Scenario 6: Partial Payment / Seat Block Advance Booking", () => {
    // 100% Refund on Advance
    const fullAdvanceRefund = calculateRefundBreakdown({
      baseFare: 10000,
      totalPrice: 10600,
      paidAmount: 3000,
      paymentType: "ADVANCE",
      refundPercent: 100,
      taxBreakdown: [],
    });
    expect(fullAdvanceRefund.finalRefundAmount).toBe(3000);

    // 75% Refund on Advance (Cancellation charge is 25% of Base Fare = 2500)
    const partialAdvanceRefund75 = calculateRefundBreakdown({
      baseFare: 10000,
      totalPrice: 10600,
      paidAmount: 3000,
      paymentType: "ADVANCE",
      refundPercent: 75,
      taxBreakdown: [],
    });
    expect(partialAdvanceRefund75.cancellationCharges).toBe(2500);
    expect(partialAdvanceRefund75.finalRefundAmount).toBe(500); // 3000 paid - 2500 cancellation fee

    // 50% Refund on Advance (Cancellation charge is 50% of Base Fare = 5000)
    const partialAdvanceRefund50 = calculateRefundBreakdown({
      baseFare: 10000,
      totalPrice: 10600,
      paidAmount: 3000,
      paymentType: "ADVANCE",
      refundPercent: 50,
      taxBreakdown: [],
    });
    expect(partialAdvanceRefund50.cancellationCharges).toBe(5000);
    expect(partialAdvanceRefund50.finalRefundAmount).toBe(0); // 3000 paid - 5000 = 0 refund
  });

  it("Scenario 7: Company-initiated Cancellation (100% including GST/Convenience)", () => {
    const breakdown = calculateRefundBreakdown({
      baseFare: 10000,
      totalPrice: 10600,
      paidAmount: 10600,
      paymentType: "FULL",
      refundPercent: 50, // Should be ignored
      taxBreakdown,
      isCompanyCancellation: true,
    });

    expect(breakdown.baseFare).toBe(10000);
    expect(breakdown.gst).toBe(500);
    expect(breakdown.convenienceFee).toBe(100);
    expect(breakdown.cancellationCharges).toBe(0);
    expect(breakdown.finalRefundAmount).toBe(10600); // Full paid amount returned
  });

  it("Policy Rules matching: should match day windows correctly", async () => {
    vi.mocked(prisma.platformSetting.findUnique).mockResolvedValue(null);

    const departure = new Date();
    departure.setDate(departure.getDate() + 32); // 32 days from now

    const res = await getRefundPercentage(departure, new Date());
    expect(res.refundPercent).toBe(100);

    const departure75 = new Date();
    departure75.setDate(departure75.getDate() + 20); // 20 days from now
    const res75 = await getRefundPercentage(departure75, new Date());
    expect(res75.refundPercent).toBe(75);

    const departureExpired = new Date();
    departureExpired.setDate(departureExpired.getDate() - 1); // Started yesterday
    const resExpired = await getRefundPercentage(departureExpired, new Date());
    expect(resExpired.refundPercent).toBe(0);
  });
});
