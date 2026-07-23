import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendRefundResolved: vi.fn() }));
vi.mock("@/lib/coupon-engine", () => ({ generateCouponCode: vi.fn(() => "PARAM-TESTCODE") }));
vi.mock("@/lib/db", () => {
  const mockPrisma = {
    refundRequest: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    booking: {
      update: vi.fn(),
    },
    travelCoupon: {
      create: vi.fn(),
    },
    couponTransaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  mockPrisma.$transaction = vi.fn().mockImplementation(async (callback) => callback(mockPrisma));
  return { prisma: mockPrisma };
});

import { PATCH } from "@/app/api/admin/refunds/[id]/route";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { sendRefundResolved } from "@/lib/email";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockLogActivity = vi.mocked(logActivity);
const mockSendRefundResolved = vi.mocked(sendRefundResolved);
const mockFindUnique = vi.mocked(prisma.refundRequest.findUnique);
const mockRefundUpdate = vi.mocked(prisma.refundRequest.update);
const mockBookingUpdate = vi.mocked(prisma.booking.update);
const mockCouponCreate = vi.mocked(prisma.travelCoupon.create);

const createRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

const baseRefundRequest = {
  id: "r1",
  approvedAt: null,
  processedAt: null,
  remarks: null,
  utrNumber: null,
  finalRefundAmount: 500,
  refundMethod: "BANK_TRANSFER",
  booking: {
    id: "b1",
    userId: "u1",
    paidAmount: 500,
    totalPrice: 1000,
    bookingStatus: "CANCELLED",
    experience: { title: "Test Trek" },
    slot: { date: new Date("2026-01-01") },
    user: { name: "Alice", email: "alice@example.com" },
  },
};

describe("PATCH /api/admin/refunds/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin1" } as any);
    mockRefundUpdate.mockResolvedValue({} as any);
    mockBookingUpdate.mockResolvedValue({} as any);
    mockCouponCreate.mockResolvedValue({ id: "coupon1" } as any);
    mockLogActivity.mockResolvedValue(undefined as any);
    mockSendRefundResolved.mockResolvedValue(undefined as any);
  });

  it("returns 404 when refund request is missing", async () => {
    mockFindUnique.mockResolvedValue(null);

    const response = await PATCH(createRequest({ status: "APPROVED" }), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 400 for an invalid status value", async () => {
    const response = await PATCH(createRequest({ status: "NOT_A_REAL_STATUS" }), {
      params: Promise.resolve({ id: "r1" }),
    });

    expect(response.status).toBe(400);
  });

  it("updates status without completing the refund for non-terminal statuses", async () => {
    mockFindUnique.mockResolvedValue(baseRefundRequest as any);

    const response = await PATCH(createRequest({ status: "APPROVED" }), {
      params: Promise.resolve({ id: "r1" }),
    });

    expect(response.status).toBe(200);
    expect(mockBookingUpdate).not.toHaveBeenCalled();
    expect(mockLogActivity).toHaveBeenCalledWith(
      "REFUND_STATUS_UPDATED",
      "admin1",
      "RefundRequest",
      "r1",
      expect.objectContaining({ status: "APPROVED" }),
    );
  });

  it("settles the booking and records a bank-transfer reference on completion", async () => {
    mockFindUnique.mockResolvedValue(baseRefundRequest as any);

    const response = await PATCH(
      createRequest({ status: "TRANSFER_COMPLETED", utrNumber: "UTR12345" }),
      { params: Promise.resolve({ id: "r1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockBookingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "b1" },
        data: expect.objectContaining({
          paymentStatus: "REFUNDED",
          paidAmount: 0,
          refundNote: "UTR12345",
        }),
      }),
    );
    expect(mockCouponCreate).not.toHaveBeenCalled();
    expect(mockSendRefundResolved).toHaveBeenCalledWith(
      expect.objectContaining({ refundPreference: "BANK_REFUND", refundNote: "UTR12345" }),
    );
  });

  it("issues a travel coupon and settles the booking on completion", async () => {
    mockFindUnique.mockResolvedValue({ ...baseRefundRequest, refundMethod: "TRAVEL_COUPON" } as any);

    const response = await PATCH(createRequest({ status: "COMPLETED" }), {
      params: Promise.resolve({ id: "r1" }),
    });

    expect(response.status).toBe(200);
    expect(mockCouponCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ code: "PARAM-TESTCODE", customerId: "u1", originalValue: 500 }),
      }),
    );
    expect(mockBookingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ refundNote: "PARAM-TESTCODE" }) }),
    );
    expect(mockSendRefundResolved).toHaveBeenCalledWith(
      expect.objectContaining({ refundPreference: "COUPON", refundNote: "PARAM-TESTCODE" }),
    );
  });

  it("returns 500 and does not throw when an unexpected error occurs", async () => {
    mockFindUnique.mockRejectedValue(new Error("db down"));

    const response = await PATCH(createRequest({ status: "APPROVED" }), {
      params: Promise.resolve({ id: "r1" }),
    });

    expect(response.status).toBe(500);
  });
});
