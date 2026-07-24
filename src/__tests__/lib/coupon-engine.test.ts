import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateCoupon, redeemCoupon, restoreCouponsForBooking, isExpiredIST } from "@/lib/coupon-engine";
import { prisma } from "@/lib/db";
const CouponStatus = {
  ACTIVE: "ACTIVE",
  PARTIALLY_USED: "PARTIALLY_USED",
  FULLY_USED: "FULLY_USED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
  BLOCKED: "BLOCKED",
} as const;

const prismaClient = prisma as any;

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
      vi.mocked(prismaClient.travelCoupon.findUnique).mockResolvedValue(null);
      const res = await validateCoupon("BAD-CODE", "user1");
      expect(res.error).toBe("Invalid coupon code.");
    });

    it("returns error if coupon belongs to another user", async () => {
      vi.mocked(prismaClient.travelCoupon.findUnique).mockResolvedValue({
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

      vi.mocked(prismaClient.travelCoupon.findUnique).mockResolvedValue({
        id: "c1",
        code: "CODE",
        customerId: "user1",
        status: CouponStatus.ACTIVE,
        expiryDate: pastDate,
      } as any);

      const res = await validateCoupon("CODE", "user1");
      expect(res.error).toBe("This coupon has expired.");
      expect(prismaClient.travelCoupon.update).toHaveBeenCalled();
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

      vi.mocked(prismaClient.travelCoupon.findUnique).mockResolvedValue(mockCoupon as any);

      const res = await validateCoupon("CODE", "user1");
      expect(res.error).toBeUndefined();
      expect(res.coupon?.id).toBe("c1");
    });

    it("returns error if coupon is fully redeemed", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      vi.mocked(prismaClient.travelCoupon.findUnique).mockResolvedValue({
        id: "c1",
        code: "CODE",
        customerId: "user1",
        status: CouponStatus.FULLY_USED,
        balance: 0,
        expiryDate: futureDate,
      } as any);
      const res = await validateCoupon("CODE", "user1");
      expect(res.error).toBe("This coupon has already been fully redeemed.");
    });

    it("returns error if coupon is blocked or cancelled", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      vi.mocked(prismaClient.travelCoupon.findUnique).mockResolvedValue({
        id: "c1",
        code: "CODE",
        customerId: "user1",
        status: CouponStatus.BLOCKED,
        expiryDate: futureDate,
      } as any);
      const res = await validateCoupon("CODE", "user1");
      expect(res.error).toBe("This coupon is currently blocked.");
    });

    it("returns error if validation throws an error", async () => {
      vi.mocked(prismaClient.travelCoupon.findUnique).mockRejectedValue(new Error("Db failure"));
      const res = await validateCoupon("CODE", "user1");
      expect(res.error).toBe("Failed to validate coupon.");
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
        tx: mockTx as any,
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

    it("throws error if coupon is not found during redemption", async () => {
      const mockTx = {
        travelCoupon: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };
      await expect(
        redeemCoupon({
          couponId: "c1",
          bookingId: "b1",
          amount: 400,
          tx: mockTx as any,
        })
      ).rejects.toThrow("Coupon not found during redemption.");
    });

    it("throws error if coupon balance is insufficient", async () => {
      const mockTx = {
        travelCoupon: {
          findUnique: vi.fn().mockResolvedValue({
            id: "c1",
            balance: 200,
            originalValue: 1000,
          }),
        },
      };
      await expect(
        redeemCoupon({
          couponId: "c1",
          bookingId: "b1",
          amount: 400,
          tx: mockTx as any,
        })
      ).rejects.toThrow("Insufficient coupon balance.");
    });

    it("uses a caller-provided remarks string instead of the default", async () => {
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
        tx: mockTx as any,
        remarks: "Redeemed on balance payment for booking b1...",
      });

      expect(mockTx.couponTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ remarks: "Redeemed on balance payment for booking b1..." }),
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
        tx: mockTx as any,
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

    it("orders redemptions by createdAt ascending for deterministic charge allocation", async () => {
      const mockFindMany = vi.fn().mockResolvedValue([]);
      const mockTx = {
        couponTransaction: {
          findMany: mockFindMany,
          create: vi.fn(),
        },
        travelCoupon: {
          update: vi.fn(),
        },
      };

      await restoreCouponsForBooking({
        bookingId: "b1",
        cancellationCharges: 0,
        tx: mockTx as any,
      });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: "asc" } }),
      );
    });
  });

  describe("isExpiredIST", () => {
    it("marks coupon as not expired during the calendar day of expiry in IST", () => {
      const expiryDateStr = "2026-07-04T00:00:00.000Z";
      const mockCurrentDate = new Date("2026-07-04T12:30:00.000Z"); // July 4, 6:00 PM IST
      
      vi.useFakeTimers();
      vi.setSystemTime(mockCurrentDate);
      
      expect(isExpiredIST(expiryDateStr)).toBe(false);
      
      vi.useRealTimers();
    });

    it("marks coupon as expired after the calendar day of expiry has passed in IST", () => {
      const expiryDateStr = "2026-07-04T00:00:00.000Z";
      const mockExpiredDate = new Date("2026-07-04T18:35:00.000Z"); // July 5, 12:05 AM IST
      
      vi.useFakeTimers();
      vi.setSystemTime(mockExpiredDate);
      
      expect(isExpiredIST(expiryDateStr)).toBe(true);
      
      vi.useRealTimers();
    });
  });
});
