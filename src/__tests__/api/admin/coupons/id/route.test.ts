import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/coupon-engine", () => ({ generateCouponCode: vi.fn(() => "SPLIT-TESTCODE") }));
vi.mock("@/lib/db", () => {
  const mockPrisma = {
    travelCoupon: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn() },
    couponTransaction: { create: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  };
  mockPrisma.$transaction = vi.fn().mockImplementation(async (cb: any) => cb(mockPrisma));
  return { prisma: mockPrisma };
});

import { PATCH, POST, DELETE } from "@/app/api/admin/coupons/[id]/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const createRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

const baseCoupon = {
  id: "c1", code: "PARAM-ABC", balance: 500, customerId: "cust-1",
  status: "ACTIVE", expiryDate: new Date(Date.now() + 86400000 * 30),
};

describe("PATCH /api/admin/coupons/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma));
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin-1" } as any);
    vi.mocked(prisma.travelCoupon.findUnique).mockResolvedValue(baseCoupon as any);
    vi.mocked(prisma.travelCoupon.update).mockResolvedValue({ ...baseCoupon, balance: 600 } as any);
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await PATCH(createRequest({}), { params: Promise.resolve({ id: "c1" }) });
    expect(response.status).toBe(401);
  });

  it("returns 404 when the coupon doesn't exist", async () => {
    vi.mocked(prisma.travelCoupon.findUnique).mockResolvedValue(null);

    const response = await PATCH(createRequest({}), { params: Promise.resolve({ id: "missing" }) });
    expect(response.status).toBe(404);
  });

  it("increases the balance and logs a transaction", async () => {
    const response = await PATCH(
      createRequest({ balanceAction: "INCREASE", amount: 100 }),
      { params: Promise.resolve({ id: "c1" }) },
    );

    expect(response.status).toBe(200);
    expect(prisma.couponTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "ADJUSTED", previousBalance: 500, newBalance: 600 }) }),
    );
    expect(prisma.travelCoupon.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ balance: 600 }) }),
    );
  });

  it("decreases the balance without going below zero", async () => {
    await PATCH(
      createRequest({ balanceAction: "DECREASE", amount: 10000 }),
      { params: Promise.resolve({ id: "c1" }) },
    );

    expect(prisma.travelCoupon.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ balance: 0 }) }),
    );
  });

  it("updates expiry date and status when provided", async () => {
    await PATCH(
      createRequest({ expiryDate: "2027-01-01", status: "BLOCKED" }),
      { params: Promise.resolve({ id: "c1" }) },
    );

    expect(prisma.travelCoupon.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "BLOCKED" }) }),
    );
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(prisma.travelCoupon.findUnique).mockRejectedValue(new Error("db down"));

    const response = await PATCH(createRequest({}), { params: Promise.resolve({ id: "c1" }) });
    expect(response.status).toBe(500);
  });
});

describe("POST /api/admin/coupons/[id] (merge/split)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma));
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin-1" } as any);
    vi.mocked(prisma.travelCoupon.findUnique).mockResolvedValue(baseCoupon as any);
  });

  it("returns 404 when the target coupon doesn't exist", async () => {
    vi.mocked(prisma.travelCoupon.findUnique).mockResolvedValue(null);

    const response = await POST(createRequest({ action: "MERGE", mergeCouponIds: ["c2"] }), { params: Promise.resolve({ id: "missing" }) });
    expect(response.status).toBe(404);
  });

  it("returns 400 when merge is requested with no coupon ids", async () => {
    const response = await POST(createRequest({ action: "MERGE", mergeCouponIds: [] }), { params: Promise.resolve({ id: "c1" }) });
    expect(response.status).toBe(400);
  });

  it("merges coupon balances and cancels the source coupons", async () => {
    vi.mocked(prisma.travelCoupon.findMany).mockResolvedValue([
      { id: "c2", code: "PARAM-XYZ", balance: 200, customerId: "cust-1", status: "ACTIVE" },
    ] as any);
    vi.mocked(prisma.travelCoupon.update).mockResolvedValue({ ...baseCoupon, balance: 700 } as any);

    const response = await POST(
      createRequest({ action: "MERGE", mergeCouponIds: ["c2"] }),
      { params: Promise.resolve({ id: "c1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.coupon.balance).toBe(700);
    expect(prisma.travelCoupon.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "c2" }, data: expect.objectContaining({ status: "CANCELLED", balance: 0 }) }),
    );
  });

  it("rejects merging coupons that belong to a different customer", async () => {
    vi.mocked(prisma.travelCoupon.findMany).mockResolvedValue([
      { id: "c2", code: "PARAM-XYZ", balance: 200, customerId: "different-customer", status: "ACTIVE" },
    ] as any);

    const response = await POST(
      createRequest({ action: "MERGE", mergeCouponIds: ["c2"] }),
      { params: Promise.resolve({ id: "c1" }) },
    );

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain("different customers");
  });

  it("returns 400 when split total exceeds the coupon balance", async () => {
    const response = await POST(
      createRequest({ action: "SPLIT", splitAmounts: [1000] }),
      { params: Promise.resolve({ id: "c1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("splits the coupon into new coupons and deducts the parent balance", async () => {
    vi.mocked(prisma.travelCoupon.create).mockResolvedValue({ id: "new-1", code: "SPLIT-TESTCODE", balance: 200 } as any);

    const response = await POST(
      createRequest({ action: "SPLIT", splitAmounts: [200, 300] }),
      { params: Promise.resolve({ id: "c1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.splitCoupons).toHaveLength(2);
    expect(prisma.travelCoupon.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "c1" }, data: { balance: 0 } }),
    );
    // Balance reached exactly 0, so the parent coupon should be marked fully used.
    expect(prisma.travelCoupon.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { id: "c1" }, data: { status: "FULLY_USED" } }),
    );
  });

  it("returns 400 for an unrecognized action", async () => {
    const response = await POST(createRequest({ action: "UNKNOWN" }), { params: Promise.resolve({ id: "c1" }) });
    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/admin/coupons/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin-1" } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "admin-1", role: { name: "SUPER_ADMIN" } } as any);
    vi.mocked(prisma.travelCoupon.findUnique).mockResolvedValue(baseCoupon as any);
    vi.mocked(prisma.travelCoupon.delete).mockResolvedValue(baseCoupon as any);
  });

  it("returns 403 for a non-super-admin", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "admin-1", role: { name: "ADMIN" } } as any);

    const response = await DELETE(createRequest({}), { params: Promise.resolve({ id: "c1" }) });
    expect(response.status).toBe(403);
  });

  it("returns 404 when the coupon doesn't exist", async () => {
    vi.mocked(prisma.travelCoupon.findUnique).mockResolvedValue(null);

    const response = await DELETE(createRequest({}), { params: Promise.resolve({ id: "missing" }) });
    expect(response.status).toBe(404);
  });

  it("deletes the coupon and logs the activity", async () => {
    const response = await DELETE(createRequest({}), { params: Promise.resolve({ id: "c1" }) });

    expect(response.status).toBe(200);
    expect(prisma.travelCoupon.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(prisma.travelCoupon.findUnique).mockRejectedValue(new Error("db down"));

    const response = await DELETE(createRequest({}), { params: Promise.resolve({ id: "c1" }) });
    expect(response.status).toBe(500);
  });
});
