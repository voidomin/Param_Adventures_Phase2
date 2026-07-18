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

import { GET } from "@/app/api/bookings/[id]/cancel-preview/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindBooking = vi.mocked(prisma.booking.findUnique);
const mockFindUser = vi.mocked(prisma.user.findUnique);

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
});
