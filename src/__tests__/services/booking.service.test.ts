import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/db", () => {
  const mockPrisma = {
    experience: { findUnique: vi.fn() },
    payment: { updateMany: vi.fn() },
    booking: { findUnique: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
  };
  return {
    prisma: mockPrisma,
    runWithRetry: vi.fn((fn) => fn()),
  };
});

vi.mock("@/repositories/booking.repo", () => ({
  BookingRepo: {
    getTaxConfig: vi.fn(),
    findExistingPendingBooking: vi.fn(),
    findByIdempotencyKey: vi.fn(),
    findExperienceById: vi.fn(),
    findSlotById: vi.fn(),
    createBooking: vi.fn(),
    createPayment: vi.fn(),
    getRazorpayKeyId: vi.fn(),
    updateStatus: vi.fn(),
    updateSlotCapacity: vi.fn(),
    incrementSlotCapacity: vi.fn(),
  },
}));

vi.mock("@/lib/razorpay", () => ({
  getRazorpay: vi.fn(),
}));

vi.mock("@/lib/audit-logger", () => ({
  logActivity: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendBookingConfirmation: vi.fn(),
}));

import { BookingService } from "@/services/booking.service";
import { prisma } from "@/lib/db";
import { BookingRepo } from "@/repositories/booking.repo";
import { getRazorpay } from "@/lib/razorpay";

describe("BookingService.calculatePricing", () => {
  it("calculates pricing when extraAmenities is object/array instead of string", async () => {
    vi.mocked(prisma.experience.findUnique).mockResolvedValue({
      basePrice: 5000,
      extraAmenities: [
        {
          id: "g1",
          name: "Group 1",
          type: "SINGLE",
          options: [{ id: "o1", name: "Option 1", price: 500 }],
        },
      ],
    } as any);

    vi.mocked(BookingRepo.getTaxConfig).mockResolvedValue(null);

    const bookingInput = {
      experienceId: "exp-1",
      slotId: "slot-1",
      participantCount: 1,
      paymentType: "FULL" as const,
      participants: [
        {
          name: "John Doe",
          isPrimary: true,
          email: "john@example.com",
          phoneNumber: "1234567890",
          gender: "MALE",
          dateOfBirth: "1990-01-01",
          selectedAmenities: [{ groupId: "g1", optionId: "o1" }],
        },
      ] as any,
    };

    const result = await BookingService.calculatePricing(bookingInput);
    expect(result.baseFare).toBe(5500); // 5000 + 500
    expect(result.totalPrice).toBe(5500);
    expect(result.taxBreakdown).toEqual([]);
  });

  it("applies taxes successfully when taxConfig is valid JSON", async () => {
    vi.mocked(prisma.experience.findUnique).mockResolvedValue({
      basePrice: 5000,
      extraAmenities: null,
    } as any);

    vi.mocked(BookingRepo.getTaxConfig).mockResolvedValue({
      key: "taxConfig",
      value: JSON.stringify([{ name: "GST", percentage: 5 }]),
    } as any);

    const bookingInput = {
      experienceId: "exp-1",
      slotId: "slot-1",
      participantCount: 1,
      paymentType: "FULL" as const,
      participants: [
        {
          name: "John Doe",
          isPrimary: true,
          email: "john@example.com",
          phoneNumber: "1234567890",
          gender: "MALE",
          dateOfBirth: "1990-01-01",
        },
      ] as any,
    };

    const result = await BookingService.calculatePricing(bookingInput);
    expect(result.baseFare).toBe(5000);
    expect(result.totalPrice).toBe(5250); // 5000 + 5%
    expect(result.taxBreakdown).toEqual([{ name: "GST", percentage: 5, amount: 250 }]);
  });

  it("handles catch block gracefully when taxConfig contains invalid JSON", async () => {
    vi.mocked(prisma.experience.findUnique).mockResolvedValue({
      basePrice: 5000,
      extraAmenities: null,
    } as any);

    vi.mocked(BookingRepo.getTaxConfig).mockResolvedValue({
      key: "taxConfig",
      value: "invalid-json",
    } as any);

    const bookingInput = {
      experienceId: "exp-1",
      slotId: "slot-1",
      participantCount: 1,
      paymentType: "FULL" as const,
      participants: [
        {
          name: "John Doe",
          isPrimary: true,
          email: "john@example.com",
          phoneNumber: "1234567890",
          gender: "MALE",
          dateOfBirth: "1990-01-01",
        },
      ] as any,
    };

    const result = await BookingService.calculatePricing(bookingInput);
    expect(result.baseFare).toBe(5000);
    expect(result.totalPrice).toBe(5000);
    expect(result.taxBreakdown).toEqual([]);
  });

  it("throws error if experience is not found", async () => {
    vi.mocked(prisma.experience.findUnique).mockResolvedValue(null);

    const bookingInput = {
      experienceId: "exp-invalid",
      slotId: "slot-1",
      participantCount: 1,
      paymentType: "FULL" as const,
      participants: [],
    };

    await expect(BookingService.calculatePricing(bookingInput)).rejects.toThrow("EXPERIENCE_NOT_FOUND");
  });

  it("calculates pricing correctly with negative amenity deductions", async () => {
    vi.mocked(prisma.experience.findUnique).mockResolvedValue({
      basePrice: 5000,
      extraAmenities: [
        {
          id: "g1",
          name: "Transport",
          type: "SINGLE",
          options: [{ id: "o1", name: "No Transport", price: -1500 }],
        },
      ],
    } as any);

    vi.mocked(BookingRepo.getTaxConfig).mockResolvedValue(null);

    const bookingInput = {
      experienceId: "exp-1",
      slotId: "slot-1",
      participantCount: 1,
      paymentType: "FULL" as const,
      participants: [
        {
          name: "John Doe",
          isPrimary: true,
          email: "john@example.com",
          phoneNumber: "1234567890",
          gender: "MALE",
          dateOfBirth: "1990-01-01",
          selectedAmenities: [{ groupId: "g1", optionId: "o1" }],
        },
      ] as any,
    };

    const result = await BookingService.calculatePricing(bookingInput);
    expect(result.baseFare).toBe(3500); // 5000 - 1500
    expect(result.totalPrice).toBe(3500);
  });

  it("caps base fare at zero if negative deductions exceed base price", async () => {
    vi.mocked(prisma.experience.findUnique).mockResolvedValue({
      basePrice: 1000,
      extraAmenities: [
        {
          id: "g1",
          name: "Discount Options",
          type: "SINGLE",
          options: [{ id: "o1", name: "Huge Discount", price: -2000 }],
        },
      ],
    } as any);

    vi.mocked(BookingRepo.getTaxConfig).mockResolvedValue(null);

    const bookingInput = {
      experienceId: "exp-1",
      slotId: "slot-1",
      participantCount: 1,
      paymentType: "FULL" as const,
      participants: [
        {
          name: "John Doe",
          isPrimary: true,
          email: "john@example.com",
          phoneNumber: "1234567890",
          gender: "MALE",
          dateOfBirth: "1990-01-01",
          selectedAmenities: [{ groupId: "g1", optionId: "o1" }],
        },
      ] as any,
    };

    const result = await BookingService.calculatePricing(bookingInput);
    expect(result.baseFare).toBe(0); // 1000 - 2000 capped at 0
    expect(result.totalPrice).toBe(0);
  });
});

describe("BookingService.processBooking", () => {
  const mockTx = {
    booking: {
      update: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn().mockResolvedValue({ invoiceNumber: null }),
    },
    slot: { update: vi.fn() },
    payment: { updateMany: vi.fn() },
    travelCoupon: { findUnique: vi.fn(), update: vi.fn() },
    couponTransaction: { create: vi.fn(), findMany: vi.fn() },
    invoiceSequence: { upsert: vi.fn().mockResolvedValue({ fiscalYear: "26-27", lastNumber: 1 }) },
  };

  const validData = {
    experienceId: "exp-1",
    slotId: "slot-1",
    participantCount: 1,
    paymentType: "FULL" as const,
    participants: [
      { name: "John", isPrimary: true, email: "j@example.com", phoneNumber: "1", gender: "MALE", dateOfBirth: "1990-01-01" },
    ] as any,
    appliedCoupons: [] as string[],
  };

  const publishedExperience = { status: "PUBLISHED", allowAdvancePayment: false, advancePaymentAmount: null };
  const futureSlot = { id: "slot-1", experienceId: "exp-1", date: new Date(Date.now() + 86400000), remainingCapacity: 5 };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(mockTx));
    vi.mocked(prisma.experience.findUnique).mockResolvedValue({ basePrice: 1000, extraAmenities: null } as any);
    vi.mocked(BookingRepo.getTaxConfig).mockResolvedValue(null);
    vi.mocked(BookingRepo.findExistingPendingBooking).mockResolvedValue(null);
    vi.mocked(BookingRepo.findByIdempotencyKey).mockResolvedValue(null);
    vi.mocked(BookingRepo.findExperienceById).mockResolvedValue(publishedExperience as any);
    vi.mocked(BookingRepo.findSlotById).mockResolvedValue(futureSlot as any);
    vi.mocked(BookingRepo.createBooking).mockResolvedValue({
      id: "booking-1", totalPrice: 1000, participantCount: 1,
    } as any);
    vi.mocked(BookingRepo.createPayment).mockResolvedValue({ id: "payment-1", amount: 1000 } as any);
    vi.mocked(BookingRepo.getRazorpayKeyId).mockResolvedValue({ value: "rzp_key" } as any);
    vi.mocked(BookingRepo.updateSlotCapacity).mockResolvedValue({ count: 1 } as any);
    vi.mocked(BookingRepo.incrementSlotCapacity).mockResolvedValue({} as any);
  });

  it("cancels a stale pending booking for the same slot before creating a new one, restoring its reserved capacity", async () => {
    vi.mocked(BookingRepo.findExistingPendingBooking).mockResolvedValue({
      id: "old-booking", slotId: "slot-1", participantCount: 2,
    } as any);
    vi.mocked(getRazorpay).mockResolvedValue({
      orders: { create: vi.fn().mockResolvedValue({ id: "order_1" }) },
    } as any);

    await BookingService.processBooking("user-1", validData);

    expect(mockTx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "old-booking" },
        data: expect.objectContaining({ bookingStatus: "CANCELLED" }),
      }),
    );
    expect(BookingRepo.incrementSlotCapacity).toHaveBeenCalledWith(mockTx, "slot-1", 2);
  });

  it("throws INSUFFICIENT_CAPACITY when the guarded reservation loses a concurrency race", async () => {
    vi.mocked(BookingRepo.updateSlotCapacity).mockResolvedValue({ count: 0 } as any);

    await expect(BookingService.processBooking("user-1", validData)).rejects.toThrow(
      "INSUFFICIENT_CAPACITY",
    );
  });

  describe("idempotency key replay", () => {
    it("returns the existing pending booking's order instead of creating a new one", async () => {
      vi.mocked(BookingRepo.findByIdempotencyKey).mockResolvedValue({
        booking: { id: "replay-booking", bookingStatus: "REQUESTED", paidAmount: 0 },
        payment: { providerOrderId: "order_original", amount: 1000, currency: "INR" },
      } as any);
      const createOrder = vi.fn();
      vi.mocked(getRazorpay).mockResolvedValue({ orders: { create: createOrder } } as any);

      const result = await BookingService.processBooking("user-1", {
        ...validData,
        idempotencyKey: "key-1",
      });

      expect(result).toEqual(
        expect.objectContaining({
          bookingId: "replay-booking",
          orderId: "order_original",
          amount: 100000,
          currency: "INR",
        }),
      );
      expect(BookingRepo.createBooking).not.toHaveBeenCalled();
      expect(createOrder).not.toHaveBeenCalled();
    });

    it("returns fullyPaidByCoupon for a replay of an already-confirmed booking, without re-sending the confirmation email", async () => {
      vi.mocked(BookingRepo.findByIdempotencyKey).mockResolvedValue({
        booking: { id: "replay-confirmed", bookingStatus: "CONFIRMED", paidAmount: 1000 },
        payment: { providerOrderId: "COUPON_REDEMPTION", amount: 1000, currency: "INR" },
      } as any);

      const result = await BookingService.processBooking("user-1", {
        ...validData,
        idempotencyKey: "key-2",
      });

      expect(result).toEqual({ bookingId: "replay-confirmed", fullyPaidByCoupon: true });
      expect(BookingRepo.createBooking).not.toHaveBeenCalled();
    });

    it("creates a fresh booking when the idempotency key only matches a CANCELLED booking", async () => {
      // findByIdempotencyKey itself excludes CANCELLED matches (see booking.repo.ts),
      // so a dead prior attempt under the same key looks like "no match" here.
      vi.mocked(BookingRepo.findByIdempotencyKey).mockResolvedValue(null);
      vi.mocked(getRazorpay).mockResolvedValue({
        orders: { create: vi.fn().mockResolvedValue({ id: "order_new" }) },
      } as any);

      const result = await BookingService.processBooking("user-1", {
        ...validData,
        idempotencyKey: "key-3",
      });

      expect(BookingRepo.createBooking).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ orderId: "order_new" }));
    });
  });

  it("throws EXPERIENCE_NOT_AVAILABLE when the experience isn't published", async () => {
    vi.mocked(BookingRepo.findExperienceById).mockResolvedValue({ status: "DRAFT" } as any);

    await expect(BookingService.processBooking("user-1", validData)).rejects.toThrow("EXPERIENCE_NOT_AVAILABLE");
  });

  it("throws SLOT_MISMATCH when the slot doesn't belong to the experience", async () => {
    vi.mocked(BookingRepo.findSlotById).mockResolvedValue({ ...futureSlot, experienceId: "other-exp" } as any);

    await expect(BookingService.processBooking("user-1", validData)).rejects.toThrow("SLOT_MISMATCH");
  });

  it("throws SLOT_EXPIRED for a slot in the past", async () => {
    vi.mocked(BookingRepo.findSlotById).mockResolvedValue({ ...futureSlot, date: new Date(Date.now() - 86400000) } as any);

    await expect(BookingService.processBooking("user-1", validData)).rejects.toThrow("SLOT_EXPIRED");
  });

  it("throws INSUFFICIENT_CAPACITY when not enough seats remain", async () => {
    vi.mocked(BookingRepo.findSlotById).mockResolvedValue({ ...futureSlot, remainingCapacity: 0 } as any);

    await expect(BookingService.processBooking("user-1", validData)).rejects.toThrow("INSUFFICIENT_CAPACITY");
  });

  it("rejects coupons applied to advance payments", async () => {
    vi.mocked(BookingRepo.findExperienceById).mockResolvedValue({
      status: "PUBLISHED", allowAdvancePayment: true, advancePaymentAmount: 500,
    } as any);

    await expect(
      BookingService.processBooking("user-1", { ...validData, paymentType: "ADVANCE", appliedCoupons: ["CODE1"] }),
    ).rejects.toThrow("COUPON_ERROR: Coupons cannot be used for advance payments.");
  });

  it("confirms instantly and skips Razorpay when a coupon fully covers the price", async () => {
    mockTx.travelCoupon.findUnique.mockResolvedValue({
      id: "coupon-1", balance: 1000, customerId: "user-1", status: "ACTIVE", expiryDate: new Date(Date.now() + 86400000 * 30),
    });
    vi.mocked(BookingRepo.createPayment).mockResolvedValue({ id: "payment-1", amount: 0 } as any);

    const result = await BookingService.processBooking("user-1", { ...validData, appliedCoupons: ["CODE1"] });

    expect(result).toEqual({ bookingId: "booking-1", fullyPaidByCoupon: true });
    expect(mockTx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ bookingStatus: "CONFIRMED", paymentStatus: "PAID" }) }),
    );
    // Capacity is reserved once, right after the initial capacity check --
    // not decremented a second time here for the coupon-instant-pay path.
    expect(BookingRepo.updateSlotCapacity).toHaveBeenCalledWith(mockTx, "slot-1", 1);
    expect(BookingRepo.updateSlotCapacity).toHaveBeenCalledTimes(1);
  });

  it("creates a Razorpay order for the remaining balance when no coupon is applied", async () => {
    const mockOrdersCreate = vi.fn().mockResolvedValue({ id: "order_1" });
    vi.mocked(getRazorpay).mockResolvedValue({ orders: { create: mockOrdersCreate } } as any);

    const result = await BookingService.processBooking("user-1", validData);

    expect(mockOrdersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 100000, currency: "INR", receipt: "booking-1" }),
    );
    expect(result).toEqual(
      expect.objectContaining({ bookingId: "booking-1", orderId: "order_1", amount: 100000, currency: "INR" }),
    );
  });

  it("rolls back to CANCELLED and restores coupons when Razorpay order creation fails", async () => {
    vi.mocked(getRazorpay).mockResolvedValue({
      orders: { create: vi.fn().mockRejectedValue(new Error("razorpay down")) },
    } as any);
    mockTx.couponTransaction.findMany.mockResolvedValue([
      { couponId: "coupon-1", amount: 200 },
    ]);
    mockTx.travelCoupon.findUnique.mockResolvedValue({ id: "coupon-1", balance: 0 });

    await expect(BookingService.processBooking("user-1", validData)).rejects.toThrow("PAYMENT_GATEWAY_ERROR");

    expect(BookingRepo.updateStatus).toHaveBeenCalledWith(mockTx, "booking-1", "CANCELLED");
    expect(mockTx.travelCoupon.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "coupon-1" }, data: expect.objectContaining({ balance: 200, status: "ACTIVE" }) }),
    );
  });
});

describe("BookingService.confirmPayment", () => {
  const mockTx = {
    booking: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
    payment: { findFirst: vi.fn(), updateMany: vi.fn() },
    couponTransaction: { findMany: vi.fn() },
    slot: { update: vi.fn() },
    invoiceSequence: { upsert: vi.fn().mockResolvedValue({ fiscalYear: "26-27", lastNumber: 1 }) },
  };

  const baseBooking = {
    id: "booking-1", userId: "user-1", bookingStatus: "REQUESTED",
    participantCount: 2, slotId: "slot-1", totalPrice: 1000, paidAmount: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(mockTx));
    mockTx.booking.findUnique.mockResolvedValue(baseBooking);
    mockTx.payment.findFirst.mockResolvedValue({ id: "payment-1", amount: 1000, status: "PENDING" });
    mockTx.couponTransaction.findMany.mockResolvedValue([]);
    mockTx.booking.update.mockResolvedValue({ ...baseBooking, bookingStatus: "CONFIRMED", paymentStatus: "PAID" });
    mockTx.booking.findMany.mockResolvedValue([]);
    vi.mocked(BookingRepo.incrementSlotCapacity).mockResolvedValue({} as any);
  });

  it("throws BOOKING_NOT_FOUND when the booking doesn't exist", async () => {
    mockTx.booking.findUnique.mockResolvedValue(null);

    await expect(BookingService.confirmPayment("missing", "order_1", "pay_1", {})).rejects.toThrow("BOOKING_NOT_FOUND");
  });

  it("throws PAYMENT_NOT_FOUND when no payment record matches the order", async () => {
    mockTx.payment.findFirst.mockResolvedValue(null);

    await expect(BookingService.confirmPayment("booking-1", "order_1", "pay_1", {})).rejects.toThrow("PAYMENT_NOT_FOUND");
  });

  it("throws COUPON_EXPIRED_DURING_CHECKOUT if a redeemed coupon expired mid-checkout", async () => {
    mockTx.couponTransaction.findMany.mockResolvedValue([
      { coupon: { expiryDate: new Date("2020-01-01") } },
    ]);

    await expect(BookingService.confirmPayment("booking-1", "order_1", "pay_1", {})).rejects.toThrow("COUPON_EXPIRED_DURING_CHECKOUT");
  });

  it("is idempotent when the payment is already marked PAID", async () => {
    mockTx.payment.findFirst.mockResolvedValue({ id: "payment-1", amount: 1000, status: "PAID" });

    const result = await BookingService.confirmPayment("booking-1", "order_1", "pay_1", {});

    expect(result).toEqual(baseBooking);
    expect(mockTx.booking.update).not.toHaveBeenCalled();
  });

  it("confirms the booking and marks the payment PAID -- capacity was already reserved at booking creation, not decremented here", async () => {
    await BookingService.confirmPayment("booking-1", "order_1", "pay_1", { event: "payment.captured" });

    expect(mockTx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "booking-1" },
        data: expect.objectContaining({ bookingStatus: "CONFIRMED", paymentStatus: "PAID", paidAmount: 1000 }),
      }),
    );
    expect(mockTx.slot.update).not.toHaveBeenCalled();
    expect(mockTx.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PAID", providerPaymentId: "pay_1" }) }),
    );
  });

  it("cancels sibling pending bookings for the same user+slot and restores the capacity they had reserved", async () => {
    mockTx.booking.findMany.mockResolvedValue([
      { id: "sibling-1", participantCount: 1 },
      { id: "sibling-2", participantCount: 3 },
    ] as any);

    await BookingService.confirmPayment("booking-1", "order_1", "pay_1", {});

    expect(mockTx.booking.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["sibling-1", "sibling-2"] } },
      data: { bookingStatus: "CANCELLED", paymentStatus: "FAILED" },
    });
    expect(BookingRepo.incrementSlotCapacity).toHaveBeenCalledWith(mockTx, "slot-1", 4);
  });

  it("does not touch capacity when there are no sibling pending bookings to cancel", async () => {
    await BookingService.confirmPayment("booking-1", "order_1", "pay_1", {});

    expect(mockTx.booking.updateMany).not.toHaveBeenCalled();
    expect(BookingRepo.incrementSlotCapacity).not.toHaveBeenCalled();
  });

  it("sets PARTIALLY_PAID when the payment doesn't cover the full remaining balance", async () => {
    mockTx.payment.findFirst.mockResolvedValue({ id: "payment-1", amount: 400, status: "PENDING" });

    await BookingService.confirmPayment("booking-1", "order_1", "pay_1", {});

    expect(mockTx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentStatus: "PARTIALLY_PAID", paidAmount: 400 }) }),
    );
  });

  it("treats a P2025 (record not found on update) race as already-paid and returns the current booking", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue({ code: "P2025" });
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(baseBooking as any);

    const result = await BookingService.confirmPayment("booking-1", "order_1", "pay_1", {});

    expect(result).toEqual(baseBooking);
  });

  it("rethrows unexpected errors", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("db exploded"));

    await expect(BookingService.confirmPayment("booking-1", "order_1", "pay_1", {})).rejects.toThrow("db exploded");
  });

  describe("autoExpireAbandonedBookings", () => {
    beforeEach(() => {
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(mockTx));
    });

    it("returns 0 and never opens a transaction when nothing is abandoned", async () => {
      vi.mocked(prisma.booking.findMany).mockResolvedValue([]);

      const count = await BookingService.autoExpireAbandonedBookings();

      expect(count).toBe(0);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("cancels each abandoned booking, marks payment FAILED, and restores its reserved capacity", async () => {
      vi.mocked(prisma.booking.findMany).mockResolvedValue([
        { id: "b1", slotId: "slot-1", participantCount: 2 },
        { id: "b2", slotId: "slot-2", participantCount: 1 },
      ] as any);

      const count = await BookingService.autoExpireAbandonedBookings();

      expect(count).toBe(2);
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ bookingStatus: "REQUESTED", paymentStatus: "PENDING" }),
        }),
      );
      expect(mockTx.booking.update).toHaveBeenCalledWith({
        where: { id: "b1" },
        data: expect.objectContaining({ bookingStatus: "CANCELLED", paymentStatus: "FAILED" }),
      });
      expect(mockTx.booking.update).toHaveBeenCalledWith({
        where: { id: "b2" },
        data: expect.objectContaining({ bookingStatus: "CANCELLED", paymentStatus: "FAILED" }),
      });
      expect(BookingRepo.incrementSlotCapacity).toHaveBeenCalledWith(mockTx, "slot-1", 2);
      expect(BookingRepo.incrementSlotCapacity).toHaveBeenCalledWith(mockTx, "slot-2", 1);
    });

    it("skips capacity restoration for a booking with no slotId", async () => {
      vi.mocked(prisma.booking.findMany).mockResolvedValue([
        { id: "b1", slotId: null, participantCount: 1 },
      ] as any);

      await BookingService.autoExpireAbandonedBookings();

      expect(BookingRepo.incrementSlotCapacity).not.toHaveBeenCalled();
    });
  });
});
