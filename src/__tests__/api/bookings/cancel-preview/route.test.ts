import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    booking: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/refund-engine", () => ({
  getRefundPercentage: vi.fn().mockResolvedValue({ refundPercent: 100, daysBefore: 15 }),
  calculateRefundBreakdown: vi.fn().mockReturnValue({
    baseFare: 1000,
    gst: 50,
    convenienceFee: 10,
    cancellationPercent: 0,
    cancellationCharges: 0,
    finalRefundAmount: 1000,
  }),
}));

vi.mock("@/lib/coupon-engine", () => ({
  restoreCouponsForBooking: vi.fn().mockResolvedValue({ totalRestored: 0 }),
}));

import { GET } from "@/app/api/bookings/[id]/cancel-preview/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { calculateRefundBreakdown } from "@/lib/refund-engine";
import { restoreCouponsForBooking } from "@/lib/coupon-engine";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindBooking = vi.mocked(prisma.booking.findUnique);
const mockFindUser = vi.mocked(prisma.user.findUnique);
const mockRestoreCouponsForBooking = vi.mocked(restoreCouponsForBooking);
const mockCalculateRefundBreakdown = vi.mocked(calculateRefundBreakdown);

const createRequest = (url: string) =>
  new NextRequest(url, { method: "GET" });

describe("GET /api/bookings/[id]/cancel-preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when participant ID is already cancelled", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      userId: "u1",
    } as any);

    mockFindUser.mockResolvedValue({
      id: "u1",
      role: { name: "USER" },
    } as any);

    mockFindBooking.mockResolvedValue({
      id: "b1",
      userId: "u1",
      totalPrice: 2000,
      paidAmount: 2000,
      paymentType: "FULL",
      experience: { basePrice: 1000 },
      participants: [
        { id: "p1", isCancelled: true, name: "Leela" },
        { id: "p2", isCancelled: false, name: "John" },
      ],
    } as any);

    // Try previewing cancellation of p1 (already cancelled)
    const req = createRequest("http://localhost/api/bookings/b1/cancel-preview?participantIds=p1");
    const response = await GET(req, {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid or already cancelled participant IDs: p1");
  });

  it("returns 200 successfully for an active participant cancellation", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      userId: "u1",
    } as any);

    mockFindUser.mockResolvedValue({
      id: "u1",
      role: { name: "USER" },
    } as any);

    mockFindBooking.mockResolvedValue({
      id: "b1",
      userId: "u1",
      totalPrice: 2000,
      paidAmount: 2000,
      paymentType: "FULL",
      experience: { basePrice: 1000 },
      participants: [
        { id: "p1", isCancelled: true, name: "Leela" },
        { id: "p2", isCancelled: false, name: "John" },
      ],
    } as any);

    // Preview cancellation of active participant p2
    const req = createRequest("http://localhost/api/bookings/b1/cancel-preview?participantIds=p2");
    const response = await GET(req, {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.finalRefundAmount).toBe(1000);
  });

  it("passes isCompanyCancellation: false when the booking's own customer previews it", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUser.mockResolvedValue({ id: "u1", role: { name: "REGISTERED_USER" } } as any);
    mockFindBooking.mockResolvedValue({
      id: "b1",
      userId: "u1",
      totalPrice: 2000,
      paidAmount: 2000,
      paymentType: "FULL",
      experience: { basePrice: 1000 },
      participants: [{ id: "p1", isCancelled: false, name: "Leela" }],
    } as any);

    await GET(createRequest("http://localhost/api/bookings/b1/cancel-preview"), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(mockCalculateRefundBreakdown).toHaveBeenCalledWith(
      expect.objectContaining({ isCompanyCancellation: false }),
    );
  });

  it("passes isCompanyCancellation: true when an admin previews someone else's booking", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin-1" } as any);
    mockFindUser.mockResolvedValue({ id: "admin-1", role: { name: "ADMIN" } } as any);
    mockFindBooking.mockResolvedValue({
      id: "b1",
      userId: "u1",
      totalPrice: 2000,
      paidAmount: 2000,
      paymentType: "FULL",
      experience: { basePrice: 1000 },
      participants: [{ id: "p1", isCancelled: false, name: "Leela" }],
    } as any);

    await GET(createRequest("http://localhost/api/bookings/b1/cancel-preview"), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(mockCalculateRefundBreakdown).toHaveBeenCalledWith(
      expect.objectContaining({ isCompanyCancellation: true }),
    );
  });

  it("previews the pending coupon-restore amount without writing anything (dryRun)", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUser.mockResolvedValue({ id: "u1", role: { name: "REGISTERED_USER" } } as any);
    mockFindBooking.mockResolvedValue({
      id: "b1",
      userId: "u1",
      totalPrice: 2000,
      paidAmount: 2000,
      paymentType: "FULL",
      experience: { basePrice: 1000 },
      participants: [{ id: "p1", isCancelled: false, name: "Leela" }],
    } as any);
    mockRestoreCouponsForBooking.mockResolvedValue({ totalRestored: 250 } as any);

    const req = createRequest("http://localhost/api/bookings/b1/cancel-preview?participantIds=p1");
    const response = await GET(req, { params: Promise.resolve({ id: "b1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.couponRestoreAmount).toBe(250);
    expect(mockRestoreCouponsForBooking).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: true }),
    );
  });
});
