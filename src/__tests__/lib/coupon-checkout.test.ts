import { describe, it, expect, vi, beforeEach } from "vitest";
import { BookingService } from "@/services/booking.service";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => {
  const mockPrisma = {
    experience: {
      findUnique: vi.fn(),
    },
    slot: {
      findUnique: vi.fn(),
    },
    booking: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    travelCoupon: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    couponTransaction: {
      create: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    platformSetting: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return {
    prisma: mockPrisma,
    runWithRetry: vi.fn((fn) => fn()),
  };
});

const prismaClient = prisma as any;

describe("Coupon Checkout Validation & Business Rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("processBooking Validation", () => {
    it("fails when coupons are applied to advance payments", async () => {
      const mockExperience = {
        id: "exp1",
        title: "Trek",
        allowAdvancePayment: true,
        advancePaymentAmount: 500,
        basePrice: 2000,
        status: "PUBLISHED",
        allowBookings: true,
        extraAmenities: "[]",
      };
      const mockSlot = {
        id: "slot1",
        experienceId: "exp1",
        date: new Date(Date.now() + 86400000), // tomorrow
        capacity: 10,
        bookedCount: 0,
        remainingCapacity: 10,
      };

      vi.mocked(prismaClient.experience.findUnique).mockResolvedValue(mockExperience);
      vi.mocked(prismaClient.slot.findUnique).mockResolvedValue(mockSlot);
      vi.mocked(prismaClient.booking.findFirst).mockResolvedValue(null);
      vi.mocked(prismaClient.platformSetting.findUnique).mockResolvedValue(null);

      // Trigger transaction implementation
      prismaClient.$transaction = vi.fn().mockImplementation(async (callback) => {
        return callback(prismaClient);
      });

      const input = {
        experienceId: "exp1",
        slotId: "slot1",
        participantCount: 1,
        participants: [
          {
            name: "John Doe",
            email: "john@example.com",
            phoneNumber: "9999999999",
            gender: "Male",
            dateOfBirth: "1990-01-01",
            bloodGroup: "O+",
            emergencyContactName: "Jane Doe",
            emergencyContactNumber: "9999999998",
            emergencyRelationship: "Spouse",
            pickupPoint: "",
            dropPoint: "",
            selectedAmenities: [],
          },
        ],
        paymentType: "ADVANCE" as const,
        appliedCoupons: ["PARAM-COUPON1"],
      };

      await expect(
        BookingService.processBooking("user1", input)
      ).rejects.toThrow("COUPON_ERROR: Coupons cannot be used for advance payments.");
    });

    it("fails when a coupon value exceeds the booking payment amount", async () => {
      const mockExperience = {
        id: "exp1",
        title: "Trek",
        allowAdvancePayment: false,
        basePrice: 1000,
        status: "PUBLISHED",
        allowBookings: true,
        extraAmenities: "[]",
      };
      const mockSlot = {
        id: "slot1",
        experienceId: "exp1",
        date: new Date(Date.now() + 86400000), // tomorrow
        capacity: 10,
        bookedCount: 0,
        remainingCapacity: 10,
      };
      const mockCoupon = {
        id: "c1",
        code: "PARAM-BIG",
        customerId: "user1",
        balance: 1500, // exceeds 1000 total price
        expiryDate: new Date(Date.now() + 10000000),
        status: "ACTIVE",
      };

      vi.mocked(prismaClient.experience.findUnique).mockResolvedValue(mockExperience);
      vi.mocked(prismaClient.slot.findUnique).mockResolvedValue(mockSlot);
      vi.mocked(prismaClient.booking.findFirst).mockResolvedValue(null);
      vi.mocked(prismaClient.travelCoupon.findUnique).mockResolvedValue(mockCoupon);
      vi.mocked(prismaClient.platformSetting.findUnique).mockResolvedValue(null);

      prismaClient.$transaction = vi.fn().mockImplementation(async (callback) => {
        return callback(prismaClient);
      });

      const input = {
        experienceId: "exp1",
        slotId: "slot1",
        participantCount: 1,
        participants: [
          {
            name: "John Doe",
            email: "john@example.com",
            phoneNumber: "9999999999",
            gender: "Male",
            dateOfBirth: "1990-01-01",
            bloodGroup: "O+",
            emergencyContactName: "Jane Doe",
            emergencyContactNumber: "9999999998",
            emergencyRelationship: "Spouse",
            pickupPoint: "",
            dropPoint: "",
            selectedAmenities: [],
          },
        ],
        paymentType: "FULL" as const,
        appliedCoupons: ["PARAM-BIG"],
      };

      await expect(
        BookingService.processBooking("user1", input)
      ).rejects.toThrow("COUPON_ERROR: Coupon value exceeds the booking/payment amount.");
    });
  });
});
