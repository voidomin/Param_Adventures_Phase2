import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendRefundResolved: vi.fn() }));
vi.mock("@/lib/coupon-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/coupon-engine")>();
  return { ...actual };
});
vi.mock("@/lib/monitoring", () => ({ logError: vi.fn() }));
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
      update: vi.fn(),
    },
    couponTransaction: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    payment: {
      updateMany: vi.fn(),
    },
    creditNoteSequence: {
      upsert: vi.fn().mockResolvedValue({ fiscalYear: "26-27", lastNumber: 1 }),
    },
    creditNote: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  mockPrisma.$transaction = vi.fn().mockImplementation(async (callback) => callback(mockPrisma));
  return { prisma: mockPrisma, runWithRetry: vi.fn((fn) => fn()) };
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
const mockCouponUpdate = vi.mocked(prisma.travelCoupon.update);
const mockCouponTransactionFindMany = vi.mocked(prisma.couponTransaction.findMany);

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
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { bookingId: "b1", status: "PAID" },
      data: { status: "REFUNDED" },
    });
  });

  it("does not touch Payment rows when the booking isn't fully refunded (stays CONFIRMED)", async () => {
    mockFindUnique.mockResolvedValue({
      ...baseRefundRequest,
      booking: { ...baseRefundRequest.booking, bookingStatus: "CONFIRMED", paidAmount: 1000, totalPrice: 1000 },
    } as any);

    const response = await PATCH(
      createRequest({ status: "TRANSFER_COMPLETED", utrNumber: "UTR999" }),
      { params: Promise.resolve({ id: "r1" }) },
    );

    expect(response.status).toBe(200);
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
  });

  it("issues a travel coupon and settles the booking on completion", async () => {
    mockFindUnique.mockResolvedValue({ ...baseRefundRequest, refundMethod: "TRAVEL_COUPON" } as any);

    const response = await PATCH(createRequest({ status: "COMPLETED" }), {
      params: Promise.resolve({ id: "r1" }),
    });

    expect(response.status).toBe(200);
    expect(mockCouponCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ code: expect.any(String), customerId: "u1", originalValue: 500 }),
      }),
    );
    expect(mockBookingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ refundNote: expect.any(String) }) }),
    );
    expect(mockSendRefundResolved).toHaveBeenCalledWith(
      expect.objectContaining({ refundPreference: "COUPON", refundNote: expect.any(String) }),
    );
  });

  it("returns 500 and does not throw when an unexpected error occurs", async () => {
    mockFindUnique.mockRejectedValue(new Error("db down"));

    const response = await PATCH(createRequest({ status: "APPROVED" }), {
      params: Promise.resolve({ id: "r1" }),
    });

    expect(response.status).toBe(500);
  });

  it("issues a GST credit note when a cash refund resolves", async () => {
    mockFindUnique.mockResolvedValue(baseRefundRequest as any);

    const response = await PATCH(
      createRequest({ status: "TRANSFER_COMPLETED", utrNumber: "UTR12345" }),
      { params: Promise.resolve({ id: "r1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.creditNoteNumber).toBe("PARAM/CN/26/0001");
    expect(prisma.creditNote.create).toHaveBeenCalledWith({
      data: { bookingId: "b1", creditNoteNumber: "PARAM/CN/26/0001", amount: 500, reason: "Booking cancellation/refund" },
    });
  });

  it("rejects re-completing an already-COMPLETED refund instead of re-issuing it (double-payout guard)", async () => {
    mockFindUnique.mockResolvedValue({ ...baseRefundRequest, status: "COMPLETED" } as any);

    const response = await PATCH(
      createRequest({ status: "COMPLETED", utrNumber: "UTR-RETRY" }),
      { params: Promise.resolve({ id: "r1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toMatch(/already been resolved/i);
    expect(mockCouponCreate).not.toHaveBeenCalled();
    expect(mockBookingUpdate).not.toHaveBeenCalled();
    expect(prisma.creditNote.create).not.toHaveBeenCalled();
  });

  it("rejects re-completing a refund already marked TRANSFER_COMPLETED", async () => {
    mockFindUnique.mockResolvedValue({ ...baseRefundRequest, status: "TRANSFER_COMPLETED" } as any);

    const response = await PATCH(
      createRequest({ status: "TRANSFER_COMPLETED", utrNumber: "UTR-RETRY-2" }),
      { params: Promise.resolve({ id: "r1" }) },
    );

    expect(response.status).toBe(409);
    expect(mockBookingUpdate).not.toHaveBeenCalled();
  });

  it("restores the pending coupon balance when approving a refund that has a couponRestoreAmount", async () => {
    const futureExpiry = new Date();
    futureExpiry.setDate(futureExpiry.getDate() + 30);
    mockFindUnique.mockResolvedValue({
      ...baseRefundRequest,
      couponRestoreAmount: 300,
      cancellationCharges: 0,
    } as any);
    mockCouponTransactionFindMany.mockResolvedValueOnce([
      {
        id: "ct1",
        couponId: "c1",
        type: "REDEEMED",
        amount: 300,
        coupon: { id: "c1", balance: 0, originalValue: 300, expiryDate: futureExpiry },
      },
    ] as any);

    const response = await PATCH(
      createRequest({ status: "TRANSFER_COMPLETED", utrNumber: "UTR-COUPON-RESTORE" }),
      { params: Promise.resolve({ id: "r1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockCouponUpdate).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { balance: 300, status: "ACTIVE" },
    });
  });

  it("does not touch any coupon balance when couponRestoreAmount is zero", async () => {
    mockFindUnique.mockResolvedValue({ ...baseRefundRequest, couponRestoreAmount: 0 } as any);

    const response = await PATCH(
      createRequest({ status: "TRANSFER_COMPLETED", utrNumber: "UTR-NO-COUPON" }),
      { params: Promise.resolve({ id: "r1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockCouponUpdate).not.toHaveBeenCalled();
  });
});
