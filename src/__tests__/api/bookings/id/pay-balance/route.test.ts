import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/razorpay", () => ({ getRazorpay: vi.fn() }));
vi.mock("@/repositories/booking.repo", () => ({
  BookingRepo: { getRazorpayKeyId: vi.fn() },
}));
vi.mock("@/lib/db", () => {
  const mockPrisma = {
    booking: { findUnique: vi.fn(), update: vi.fn() },
    payment: { create: vi.fn(), deleteMany: vi.fn(), update: vi.fn() },
    travelCoupon: { findUnique: vi.fn(), update: vi.fn() },
    couponTransaction: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  mockPrisma.$transaction = vi.fn().mockImplementation(async (cb: any) => cb(mockPrisma));
  return { prisma: mockPrisma, runWithRetry: vi.fn((fn) => fn()) };
});

import { POST } from "@/app/api/bookings/[id]/pay-balance/route";
import { authorizeRequest } from "@/lib/api-auth";
import { getRazorpay } from "@/lib/razorpay";
import { BookingRepo } from "@/repositories/booking.repo";
import { logActivity } from "@/lib/audit-logger";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const createRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

const initialBooking = { userId: "u1", bookingStatus: "CONFIRMED", remainingBalance: 500 };
const fullBooking = {
  id: "b1", userId: "u1", bookingStatus: "CONFIRMED", paymentStatus: "PARTIALLY_PAID",
  paidAmount: 700, remainingBalance: 500, experienceId: "exp-1",
};

describe("POST /api/bookings/[id]/pay-balance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma));
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    vi.mocked(prisma.booking.findUnique)
      .mockResolvedValueOnce(initialBooking as any)
      .mockResolvedValueOnce(fullBooking as any);
    vi.mocked(prisma.booking.update).mockResolvedValue({ ...fullBooking, remainingBalance: 500 } as any);
    vi.mocked(BookingRepo.getRazorpayKeyId).mockResolvedValue({ value: "rzp_key" } as any);
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await POST(createRequest({}), { params: Promise.resolve({ id: "b1" }) });
    expect(response.status).toBe(401);
  });

  it("returns 404 when the booking doesn't exist", async () => {
    vi.mocked(prisma.booking.findUnique).mockReset().mockResolvedValue(null);

    const response = await POST(createRequest({}), { params: Promise.resolve({ id: "missing" }) });
    expect(response.status).toBe(404);
  });

  it("returns 403 when the booking belongs to a different user", async () => {
    vi.mocked(prisma.booking.findUnique).mockReset().mockResolvedValue({ ...initialBooking, userId: "someone-else" } as any);

    const response = await POST(createRequest({}), { params: Promise.resolve({ id: "b1" }) });
    expect(response.status).toBe(403);
  });

  it("returns 400 for a cancelled booking", async () => {
    vi.mocked(prisma.booking.findUnique).mockReset().mockResolvedValue({ ...initialBooking, bookingStatus: "CANCELLED" } as any);

    const response = await POST(createRequest({}), { params: Promise.resolve({ id: "b1" }) });
    expect(response.status).toBe(400);
  });

  it("returns 400 when the booking is already fully paid", async () => {
    vi.mocked(prisma.booking.findUnique).mockReset().mockResolvedValue({ ...initialBooking, remainingBalance: 0 } as any);

    const response = await POST(createRequest({}), { params: Promise.resolve({ id: "b1" }) });
    expect(response.status).toBe(400);
  });

  it("creates a Razorpay order for the remaining balance when no coupon is applied", async () => {
    const mockOrdersCreate = vi.fn().mockResolvedValue({ id: "order_1" });
    vi.mocked(getRazorpay).mockResolvedValue({ orders: { create: mockOrdersCreate } } as any);
    vi.mocked(prisma.payment.create).mockResolvedValue({ id: "payment-1" } as any);

    const response = await POST(createRequest({}), { params: Promise.resolve({ id: "b1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(expect.objectContaining({ bookingId: "b1", orderId: "order_1", amount: 50000, currency: "INR" }));
    expect(mockOrdersCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 50000 }));
  });

  it("pays the balance fully with a coupon and skips Razorpay", async () => {
    vi.mocked(prisma.travelCoupon.findUnique).mockResolvedValue({
      id: "coupon-1", balance: 500, customerId: "u1", status: "ACTIVE", expiryDate: new Date(Date.now() + 86400000 * 10),
    } as any);

    const response = await POST(
      createRequest({ appliedCoupons: ["CODE1"] }),
      { params: Promise.resolve({ id: "b1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, bookingId: "b1", fullyPaidByCoupon: true });
    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PAID", provider: "MANUAL" }) }),
    );
    expect(logActivity).toHaveBeenCalledWith("BOOKING_BALANCE_PAID_BY_COUPON", "u1", "Booking", "b1", expect.anything());
  });

  it("returns 400 with a friendly message for coupon errors", async () => {
    vi.mocked(prisma.travelCoupon.findUnique).mockResolvedValue(null);

    const response = await POST(
      createRequest({ appliedCoupons: ["BADCODE"] }),
      { params: Promise.resolve({ id: "b1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid coupon code");
  });

  it("returns 500 on an unexpected error", async () => {
    vi.mocked(prisma.booking.findUnique).mockReset().mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest({}), { params: Promise.resolve({ id: "b1" }) });
    expect(response.status).toBe(500);
  });
});
