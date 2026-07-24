import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/refund-engine", () => ({
  getRefundPercentage: vi.fn(),
  calculateRefundBreakdown: vi.fn(),
}));
vi.mock("@/lib/coupon-engine", () => ({
  restoreCouponsForBooking: vi.fn(),
}));
vi.mock("@/lib/db", () => {
  const mockPrisma = {
    booking: { findUnique: vi.fn(), update: vi.fn() },
    bookingParticipant: { updateMany: vi.fn(), count: vi.fn() },
    slot: { update: vi.fn() },
    refundRequest: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  mockPrisma.$transaction = vi.fn().mockImplementation(async (cb: any) => cb(mockPrisma));
  return { prisma: mockPrisma };
});

import { POST } from "@/app/api/bookings/[id]/cancel-participants/route";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { getRefundPercentage, calculateRefundBreakdown } from "@/lib/refund-engine";
import { restoreCouponsForBooking } from "@/lib/coupon-engine";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockGetRefundPercentage = vi.mocked(getRefundPercentage);
const mockCalculateRefundBreakdown = vi.mocked(calculateRefundBreakdown);

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
  slot: { date: new Date(Date.now() + 86400000 * 10) },
  experience: { basePrice: 1000 },
  refundAmount: null,
  participants: [
    { id: "p1", isCancelled: false, selectedAmenities: [] },
    { id: "p2", isCancelled: false, selectedAmenities: [] },
  ],
};

describe("POST /api/bookings/[id]/cancel-participants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma));
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1", roleName: "REGISTERED_USER" } as any);
    mockGetRefundPercentage.mockResolvedValue({ refundPercent: 100 } as any);
    mockCalculateRefundBreakdown.mockReturnValue({
      baseFare: 1000, gst: 0, convenienceFee: 0, cancellationPercent: 0,
      cancellationCharges: 0, finalRefundAmount: 1200,
    } as any);
    vi.mocked(restoreCouponsForBooking).mockResolvedValue(undefined as any);
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(baseBooking as any);
    vi.mocked(prisma.bookingParticipant.count).mockResolvedValue(0);
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await POST(createRequest({ participantIds: ["p1"] }), { params: Promise.resolve({ id: "b1" }) });

    expect(response.status).toBe(401);
  });

  it("returns 400 for an invalid body", async () => {
    const response = await POST(createRequest({ participantIds: [] }), { params: Promise.resolve({ id: "b1" }) });

    expect(response.status).toBe(400);
  });

  it("returns 404 when the booking doesn't exist", async () => {
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(null);

    const response = await POST(createRequest({ participantIds: ["p1"] }), { params: Promise.resolve({ id: "missing" }) });

    expect(response.status).toBe(404);
  });

  it("returns 403 when a non-owner, non-moderator tries to cancel", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "someone-else", roleName: "REGISTERED_USER" } as any);

    const response = await POST(createRequest({ participantIds: ["p1"] }), { params: Promise.resolve({ id: "b1" }) });

    expect(response.status).toBe(403);
  });

  it("allows an ADMIN to cancel a booking they don't own", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin-1", roleName: "ADMIN" } as any);

    const response = await POST(
      createRequest({ participantIds: ["p1", "p2"], preference: "NO_REFUND" }),
      { params: Promise.resolve({ id: "b1" }) },
    );

    expect(response.status).toBe(200);
  });

  it("returns 409 for an already-cancelled booking", async () => {
    vi.mocked(prisma.booking.findUnique).mockResolvedValue({ ...baseBooking, bookingStatus: "CANCELLED" } as any);

    const response = await POST(createRequest({ participantIds: ["p1"] }), { params: Promise.resolve({ id: "b1" }) });

    expect(response.status).toBe(409);
  });

  it("returns 400 for invalid or already-cancelled participant ids", async () => {
    const response = await POST(createRequest({ participantIds: ["not-a-real-participant"] }), { params: Promise.resolve({ id: "b1" }) });

    expect(response.status).toBe(400);
  });

  it("fully cancels the booking when all active participants are cancelled", async () => {
    const response = await POST(
      createRequest({ participantIds: ["p1", "p2"], preference: "BANK_REFUND" }),
      { params: Promise.resolve({ id: "b1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Booking fully cancelled.");
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ bookingStatus: "CANCELLED" }) }),
    );
    expect(prisma.slot.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "slot-1" }, data: { remainingCapacity: { increment: 2 } } }),
    );
    expect(prisma.refundRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ refundMethod: "BANK_TRANSFER" }) }),
    );
    expect(logActivity).toHaveBeenCalledWith("BOOKING_CANCELLED", "u1", "Booking", "b1", expect.anything());
  });

  it("partially cancels the booking when only some participants are cancelled", async () => {
    const response = await POST(
      createRequest({ participantIds: ["p1"], preference: "COUPON" }),
      { params: Promise.resolve({ id: "b1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Participants cancelled successfully.");
    expect(prisma.bookingParticipant.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ["p1"] } } }),
    );
    expect(prisma.refundRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ refundMethod: "TRAVEL_COUPON" }) }),
    );
  });

  it("returns 409 when a race condition already cancelled the participant", async () => {
    vi.mocked(prisma.bookingParticipant.count).mockResolvedValue(1);

    const response = await POST(createRequest({ participantIds: ["p1"] }), { params: Promise.resolve({ id: "b1" }) });

    expect(response.status).toBe(409);
  });

  it("returns 500 on an unexpected error", async () => {
    vi.mocked(prisma.booking.findUnique).mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest({ participantIds: ["p1"] }), { params: Promise.resolve({ id: "b1" }) });

    expect(response.status).toBe(500);
  });
});
