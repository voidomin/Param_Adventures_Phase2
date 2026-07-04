import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateCoupon, redeemCoupon, restoreCouponsForBooking } from "@/lib/coupon-engine";
import { prisma } from "@/lib/db";
import { CouponStatus } from "@prisma/client";

vi.mock("@/lib/db", () => ({
  prisma: {
    travelCoupon: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    couponTransaction: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("Coupon Engine Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateCoupon", () => {
    it("returns error if coupon does not exist", async () => {
      vi.mocked(prisma.travelCoupon.findUnique).mockResolvedValue(null);
      const res = await validateCoupon("BAD-CODE", "user1");
      expect(res.error).toBe("Invalid coupon code.");
    });

    it("returns error if coupon belongs to another user", async () => {
      vi.mocked(prisma.travelCoupon.findUnique).mockResolvedValue({
        id: "c1",
        code: "CODE",
        customerId: "user2",
      } as any);
      const res = await validateCoupon("CODE", "user1");
      expect(res.error).toBe("This coupon belongs to another customer.");
    });

    it("returns error if coupon has expired", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2);

      vi.mocked(prisma.travelCoupon.findUnique).mockResolvedValue({
        id: "c1",
        code: "CODE",
        customerId: "user1",
        status: CouponStatus.ACTIVE,
        expiryDate: pastDate,
      } as any);

      const res = await validateCoupon("CODE", "user1");
      expect(res.error).toBe("This coupon has expired.");
      expect(prisma.travelCoupon.update).toHaveBeenCalled();
    });

    it("returns coupon if valid", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const mockCoupon = {
        id: "c1",
        code: "CODE",
        customerId: "user1",
        status: CouponStatus.ACTIVE,
        expiryDate: futureDate,
        balance: 1000,
      };

      vi.mocked(prisma.travelCoupon.findUnique).mockResolvedValue(mockCoupon as any);

      const res = await validateCoupon("CODE", "user1");
      expect(res.error).toBeUndefined();
      expect(res.coupon.id).toBe("c1");
    });
  });

  describe("redeemCoupon", () => {
    it("deducts coupon balance and creates transaction", async () => {
      const mockTx = {
        travelCoupon: {
          findUnique: vi.fn().mockResolvedValue({
            id: "c1",
            balance: 1000,
            originalValue: 1000,
          }),
          update: vi.fn(),
        },
        couponTransaction: {
          create: vi.fn(),
        },
      };

      await redeemCoupon({
        couponId: "c1",
        bookingId: "b1",
        amount: 400,
        tx: mockTx,
      });

      expect(mockTx.travelCoupon.update).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: {
          balance: 600,
          status: CouponStatus.PARTIALLY_USED,
        },
      });

      expect(mockTx.couponTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          couponId: "c1",
          bookingId: "b1",
          type: "REDEEMED",
          amount: 400,
        }),
      });
    });
  });

  describe("restoreCouponsForBooking", () => {
    it("restores active coupons but skips expired ones", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2);

      const mockTx = {
        couponTransaction: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "t1",
              amount: 500,
              coupon: {
                id: "c1",
                balance: 200,
                originalValue: 1000,
                expiryDate: futureDate,
              },
            },
            {
              id: "t2",
              amount: 500,
              coupon: {
                id: "c2",
                balance: 0,
                originalValue: 500,
                expiryDate: pastDate, // Expired during checkout duration
              },
            },
          ]),
          create: vi.fn(),
        },
        travelCoupon: {
          update: vi.fn(),
        },
      };

      const result = await restoreCouponsForBooking({
        bookingId: "b1",
        cancellationCharges: 100, // 100 cancellation fee
        tx: mockTx,
      });

      // Cancellation charge applies to c1 first:
      // c1 redeemed 500. Remaining charge: 100.
      // c1 gets restored: 500 - 100 = 400.
      // New balance c1: 200 + 400 = 600.
      // c2 is expired, so it is skipped.
      expect(mockTx.travelCoupon.update).toHaveBeenCalledTimes(1);
      expect(mockTx.travelCoupon.update).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: {
          balance: 600,
          status: CouponStatus.PARTIALLY_USED,
        },
      });

      expect(result.totalRestored).toBe(400);
    });
  });
});
