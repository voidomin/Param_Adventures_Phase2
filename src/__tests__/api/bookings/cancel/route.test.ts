import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendBookingCancellation: vi.fn() }));
vi.mock("@/lib/monitoring", () => ({ logError: vi.fn() }));
vi.mock("@/lib/refund-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/refund-engine")>();
  return {
    ...actual,
    getRefundPercentage: vi.fn(),
    calculateRefundBreakdown: vi.fn(),
  };
});
vi.mock("@/lib/db", () => {
  const mockPrisma = {
    booking: { findUnique: vi.fn(), update: vi.fn() },
    slot: { update: vi.fn() },
    refundRequest: { create: vi.fn() },
    couponTransaction: { findMany: vi.fn() },
    $transaction: vi.fn(),
  };
  mockPrisma.$transaction = vi.fn().mockImplementation(async (cb: any) => cb(mockPrisma));
  return { prisma: mockPrisma, runWithRetry: vi.fn((fn) => fn()) };
});
vi.mock("@/lib/coupon-engine", () => ({
  restoreCouponsForBooking: vi.fn().mockResolvedValue({ totalRestored: 0 }),
}));

import { POST } from "@/app/api/bookings/[id]/cancel/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/audit-logger";
import { sendBookingCancellation } from "@/lib/email";
import { getRefundPercentage, calculateRefundBreakdown } from "@/lib/refund-engine";
import { restoreCouponsForBooking } from "@/lib/coupon-engine";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindUnique = vi.mocked(prisma.booking.findUnique);
const mockLogActivity = vi.mocked(logActivity);
const mockSendBookingCancellation = vi.mocked(sendBookingCancellation);
const mockGetRefundPercentage = vi.mocked(getRefundPercentage);
const mockCalculateRefundBreakdown = vi.mocked(calculateRefundBreakdown);
const mockRestoreCouponsForBooking = vi.mocked(restoreCouponsForBooking);

const createRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

const baseBooking = {
  id: "b1",
  userId: "u1",
  bookingStatus: "CONFIRMED",
  paymentStatus: "PAID",
  paymentType: "FULL",
  baseFare: 1000,
  totalPrice: 1200,
  paidAmount: 1200,
  taxBreakdown: [],
  participantCount: 2,
  slotId: "slot-1",
  slot: { date: new Date(Date.now() + 30 * 86400 * 1000), status: "UPCOMING" },
  experience: { title: "Trip" },
  refundAmount: null,
  user: { name: "User", email: "u@example.com" },
};

describe("POST /api/bookings/[id]/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma));
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockGetRefundPercentage.mockResolvedValue({ refundPercent: 100 } as any);
    mockCalculateRefundBreakdown.mockReturnValue({
      baseFare: 1000, gst: 0, convenienceFee: 0, cancellationPercent: 0,
      cancellationCharges: 0, finalRefundAmount: 1200,
    } as any);
    mockFindUnique.mockResolvedValue(baseBooking as any);
    mockSendBookingCancellation.mockResolvedValue(undefined as any);
    mockRestoreCouponsForBooking.mockResolvedValue({ totalRestored: 0 });
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await POST(createRequest({ preference: "COUPON" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid payload", async () => {
    const response = await POST(createRequest({}), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 404 when booking is missing", async () => {
    mockFindUnique.mockResolvedValue(null);

    const response = await POST(createRequest({ preference: "COUPON" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(404);
  });

  it.each([
    { description: "booking belongs to different user", userId: "u2", bookingStatus: "CONFIRMED", expectedStatus: 403 },
    { description: "booking already cancelled", userId: "u1", bookingStatus: "CANCELLED", expectedStatus: 409 },
    { description: "non-cancellable booking state", userId: "u1", bookingStatus: "COMPLETED", expectedStatus: 409 },
  ])("returns $expectedStatus when $description", async ({ userId, bookingStatus, expectedStatus }) => {
    mockFindUnique.mockResolvedValue({ ...baseBooking, userId, bookingStatus, slot: null } as any);

    const response = await POST(createRequest({ preference: "COUPON" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(expectedStatus);
  });

  it("returns 400 when the trip has already started", async () => {
    mockFindUnique.mockResolvedValue({
      ...baseBooking,
      slot: { ...baseBooking.slot, status: "TREK_STARTED" },
    } as any);

    const response = await POST(createRequest({ preference: "COUPON" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(400);
  });

  it("blocks cancellation if departure date is in the past", async () => {
    mockFindUnique.mockResolvedValue({
      ...baseBooking,
      slot: { date: new Date(Date.now() - 86400 * 1000), status: "UPCOMING" },
    } as any);

    const response = await POST(createRequest({ preference: "COUPON" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("departure date");
  });

  it("cancels booking, restores slot capacity, and creates a refund request when a refund is due", async () => {
    const response = await POST(
      createRequest({ preference: "BANK_REFUND", reason: "can't make it" }),
      { params: Promise.resolve({ id: "b1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "b1" },
        data: expect.objectContaining({ bookingStatus: "CANCELLED", paymentStatus: "REFUND_PENDING", refundAmount: 1200 }),
      }),
    );
    expect(prisma.slot.update).toHaveBeenCalledWith({
      where: { id: "slot-1" },
      data: { remainingCapacity: { increment: 2 } },
    });
    expect(prisma.refundRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ finalRefundAmount: 1200 }) }),
    );
    expect(mockLogActivity).toHaveBeenCalledWith("BOOKING_CANCELLED", "u1", "Booking", "b1", expect.objectContaining({ refundAmount: 1200 }));
    expect(mockSendBookingCancellation).toHaveBeenCalled();
  });

  it("cancels booking without slot update when slotId is absent", async () => {
    mockFindUnique.mockResolvedValue({
      ...baseBooking,
      slotId: null,
      participantCount: 1,
      bookingStatus: "REQUESTED",
      paymentStatus: "PENDING",
      user: { name: "", email: "u@example.com" },
      slot: null,
    } as any);

    const response = await POST(createRequest({ preference: "COUPON" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(200);
    expect(prisma.slot.update).not.toHaveBeenCalled();
  });

  it("restores slot capacity even when bookingStatus is REQUESTED (capacity is reserved from creation)", async () => {
    mockFindUnique.mockResolvedValue({
      ...baseBooking,
      bookingStatus: "REQUESTED",
      paymentStatus: "PENDING",
      user: { name: "", email: "u@example.com" },
    } as any);

    const response = await POST(createRequest({ preference: "COUPON" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(200);
    expect(prisma.slot.update).toHaveBeenCalledWith({
      where: { id: "slot-1" },
      data: { remainingCapacity: { increment: 2 } },
    });
  });

  it("does not get stuck at REFUND_PENDING and does not create a RefundRequest for a 0%-tier cancellation", async () => {
    mockCalculateRefundBreakdown.mockReturnValue({
      baseFare: 1000, gst: 0, convenienceFee: 0, cancellationPercent: 100,
      cancellationCharges: 1200, finalRefundAmount: 0,
    } as any);

    const response = await POST(createRequest({ preference: "BANK_REFUND" }), { params: Promise.resolve({ id: "b1" }) });

    expect(response.status).toBe(200);
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentStatus: "PAID", refundAmount: null }),
      }),
    );
    expect(prisma.refundRequest.create).not.toHaveBeenCalled();
  });

  it("computes the refund breakdown from a fresh paidAmount read inside the transaction, not the pre-transaction snapshot", async () => {
    // First call = the pre-validation read in the route handler (stale --
    // pretend a payment hadn't landed yet). Second call = the re-read
    // inside the transaction (fresh, payment has since landed).
    mockFindUnique
      .mockResolvedValueOnce({ ...baseBooking, paidAmount: 100 } as any)
      .mockResolvedValueOnce({ ...baseBooking, paidAmount: 1200 } as any);

    const response = await POST(createRequest({ preference: "BANK_REFUND" }), { params: Promise.resolve({ id: "b1" }) });

    expect(response.status).toBe(200);
    expect(mockCalculateRefundBreakdown).toHaveBeenCalledWith(
      expect.objectContaining({ paidAmount: 1200 }),
    );
  });

  it("returns 409 when the booking already has a refund pending admin review", async () => {
    vi.mocked(prisma.refundRequest.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed on the fields: (`bookingId`)", {
        code: "P2002",
        clientVersion: "7.0.0",
        meta: { target: ["bookingId"] },
      }),
    );

    const response = await POST(createRequest({ preference: "BANK_REFUND" }), { params: Promise.resolve({ id: "b1" }) });
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toMatch(/already has a refund pending admin review/i);
  });

  it("returns 409 when a race re-reads the booking as already cancelled inside the transaction", async () => {
    mockFindUnique
      .mockResolvedValueOnce(baseBooking as any)
      .mockResolvedValueOnce({ ...baseBooking, bookingStatus: "CANCELLED" } as any);

    const response = await POST(createRequest({ preference: "BANK_REFUND" }), { params: Promise.resolve({ id: "b1" }) });

    expect(response.status).toBe(409);
  });

  it("returns 500 on unexpected error", async () => {
    mockFindUnique.mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest({ preference: "COUPON" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(500);
  });
});
