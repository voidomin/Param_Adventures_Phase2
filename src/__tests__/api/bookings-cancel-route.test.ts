import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/audit-logger", () => ({
  logActivity: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendBookingCancellation: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    booking: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { POST } from "@/app/api/bookings/[id]/cancel/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/audit-logger";
import { sendBookingCancellation } from "@/lib/email";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindUnique = vi.mocked(prisma.booking.findUnique);
const mockTransaction = vi.mocked(prisma.$transaction);
const mockLogActivity = vi.mocked(logActivity);
const mockSendBookingCancellation = vi.mocked(sendBookingCancellation);

const createRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

describe("POST /api/bookings/[id]/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);

    const response = await POST(createRequest({}), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 404 when booking is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUnique.mockResolvedValue(null);

    const response = await POST(createRequest({ preference: "COUPON" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 403 when booking belongs to different user", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUnique.mockResolvedValue({ id: "b1", userId: "u2", bookingStatus: "CONFIRMED" } as any);

    const response = await POST(createRequest({ preference: "COUPON" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns 409 when booking already cancelled", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUnique.mockResolvedValue({ id: "b1", userId: "u1", bookingStatus: "CANCELLED" } as any);

    const response = await POST(createRequest({ preference: "COUPON" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(409);
  });

  it("returns 409 for non-cancellable booking state", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUnique.mockResolvedValue({ id: "b1", userId: "u1", bookingStatus: "COMPLETED" } as any);

    const response = await POST(createRequest({ preference: "COUPON" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(409);
  });

  it("cancels booking and restores slot capacity", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUnique.mockResolvedValue({
      id: "b1",
      userId: "u1",
      slotId: "s1",
      participantCount: 2,
      bookingStatus: "CONFIRMED",
      paymentStatus: "PAID",
      user: { name: "User", email: "u@example.com" },
      experience: { title: "Trip" },
      slot: { date: new Date("2026-06-01") },
    } as any);

    const updateBooking = vi.fn().mockResolvedValue({});
    const updateSlot = vi.fn().mockResolvedValue({});
    mockTransaction.mockImplementation(async (cb: any) => cb({
      booking: { update: updateBooking },
      slot: { update: updateSlot },
    }));

    const response = await POST(createRequest({ preference: "BANK_REFUND", reason: "can't make it" }), {
      params: Promise.resolve({ id: "b1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(updateBooking).toHaveBeenCalled();
    expect(updateSlot).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { remainingCapacity: { increment: 2 } },
    });
    expect(mockLogActivity).toHaveBeenCalled();
    expect(mockSendBookingCancellation).toHaveBeenCalled();
  });

  it("cancels booking without slot update when slotId is absent", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUnique.mockResolvedValue({
      id: "b1",
      userId: "u1",
      slotId: null,
      participantCount: 1,
      bookingStatus: "REQUESTED",
      paymentStatus: "PENDING",
      user: { name: "", email: "u@example.com" },
      experience: { title: "Trip" },
      slot: null,
    } as any);

    const updateBooking = vi.fn().mockResolvedValue({});
    const updateSlot = vi.fn().mockResolvedValue({});
    mockTransaction.mockImplementation(async (cb: any) => cb({
      booking: { update: updateBooking },
      slot: { update: updateSlot },
    }));

    const response = await POST(createRequest({ preference: "COUPON" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(200);
    expect(updateSlot).not.toHaveBeenCalled();
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUnique.mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest({ preference: "COUPON" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(500);
  });
});
