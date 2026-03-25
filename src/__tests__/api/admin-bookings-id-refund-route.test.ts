import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendRefundResolved: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    booking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/admin/bookings/[id]/refund/route";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { sendRefundResolved } from "@/lib/email";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockLogActivity = vi.mocked(logActivity);
const mockSendRefundResolved = vi.mocked(sendRefundResolved);
const mockBookingFindUnique = vi.mocked(prisma.booking.findUnique);
const mockBookingUpdate = vi.mocked(prisma.booking.update);

const createRequest = (body: unknown) =>
  ({
    json: vi.fn().mockResolvedValue(body),
  }) as unknown as NextRequest;

describe("POST /api/admin/bookings/[id]/refund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendRefundResolved.mockResolvedValue(undefined as any);
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await POST(createRequest({ refundNote: "UTR123" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid payload", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);

    const response = await POST(createRequest({ refundNote: "" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 404 when booking is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockBookingFindUnique.mockResolvedValue(null);

    const response = await POST(createRequest({ refundNote: "UTR123" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 409 when booking is not refund pending", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockBookingFindUnique.mockResolvedValue({
      id: "b1",
      paymentStatus: "PAID",
    } as any);

    const response = await POST(createRequest({ refundNote: "UTR123" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(409);
  });

  it("marks refund resolved, logs activity, and sends email", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockBookingFindUnique.mockResolvedValue({
      id: "b1",
      paymentStatus: "REFUND_PENDING",
      refundPreference: "BANK_TRANSFER",
      totalPrice: 2500,
      slot: { date: new Date("2026-04-01T00:00:00.000Z") },
      user: { name: "Akash", email: "akash@example.com" },
      experience: { title: "Everest Base Camp" },
    } as any);

    const response = await POST(createRequest({ refundNote: "UTR123" }), {
      params: Promise.resolve({ id: "b1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: {
        paymentStatus: "REFUNDED",
        refundNote: "UTR123",
      },
    });
    expect(mockLogActivity).toHaveBeenCalledWith(
      "REFUND_RESOLVED",
      "a1",
      "Booking",
      "b1",
      expect.objectContaining({ refundNote: "UTR123" }),
    );
    expect(mockSendRefundResolved).toHaveBeenCalled();
  });

  it("returns 500 on unexpected failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockBookingFindUnique.mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest({ refundNote: "UTR123" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(500);
  });
});
