import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/coupon-engine", () => ({ generateCouponCode: vi.fn(() => "PARAM-NEWCODE") }));
vi.mock("@/lib/db", () => {
  const mockPrisma = {
    travelCoupon: { findMany: vi.fn(), create: vi.fn() },
    couponTransaction: { create: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  };
  mockPrisma.$transaction = vi.fn().mockImplementation(async (cb: any) => cb(mockPrisma));
  return { prisma: mockPrisma };
});

import { GET, POST } from "@/app/api/admin/coupons/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const createGetRequest = (url: string) => ({ url } as NextRequest);
const createRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

describe("GET /api/admin/coupons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin-1" } as any);
    vi.mocked(prisma.travelCoupon.findMany).mockResolvedValue([{ id: "c1" }] as any);
  });

  it("returns the auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false, response: { status: 401 } } as any);

    const response = await GET(createGetRequest("https://x.com/api/admin/coupons"));
    expect((response as any).status).toBe(401);
  });

  it("lists all coupons with no status filter", async () => {
    const response = await GET(createGetRequest("https://x.com/api/admin/coupons"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.coupons).toHaveLength(1);
    expect(prisma.travelCoupon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it("filters by status when provided", async () => {
    await GET(createGetRequest("https://x.com/api/admin/coupons?status=ACTIVE"));

    expect(prisma.travelCoupon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "ACTIVE" } }),
    );
  });

  it("ignores the filter when status is ALL", async () => {
    await GET(createGetRequest("https://x.com/api/admin/coupons?status=ALL"));

    expect(prisma.travelCoupon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it("returns 500 on an unexpected error", async () => {
    vi.mocked(prisma.travelCoupon.findMany).mockRejectedValue(new Error("db down"));

    const response = await GET(createGetRequest("https://x.com/api/admin/coupons"));
    expect(response.status).toBe(500);
  });
});

describe("POST /api/admin/coupons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma));
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin-1" } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "cust-1", name: "Jane" } as any);
    vi.mocked(prisma.travelCoupon.create).mockResolvedValue({ id: "coupon-1", code: "PARAM-NEWCODE", balance: 500 } as any);
  });

  it("returns the auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false, response: { status: 401 } } as any);

    const response = await POST(createRequest({}));
    expect((response as any).status).toBe(401);
  });

  it("returns 400 for an invalid body", async () => {
    const response = await POST(createRequest({ customerId: "", originalValue: -5, expiryDate: "" }));
    expect(response.status).toBe(400);
  });

  it("returns 404 when the customer doesn't exist", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const response = await POST(
      createRequest({ customerId: "missing", originalValue: 500, expiryDate: "2027-01-01" }),
    );
    expect(response.status).toBe(404);
  });

  it("creates a goodwill coupon and logs an ISSUED transaction", async () => {
    const response = await POST(
      createRequest({ customerId: "cust-1", originalValue: 500, expiryDate: "2027-01-01", reason: "Service delay" }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.travelCoupon.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: "PARAM-NEWCODE", customerId: "cust-1", originalValue: 500, balance: 500, reason: "Service delay",
        }),
      }),
    );
    expect(prisma.couponTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "ISSUED", newBalance: 500 }) }),
    );
  });

  it("defaults the reason when none is provided", async () => {
    await POST(createRequest({ customerId: "cust-1", originalValue: 500, expiryDate: "2027-01-01" }));

    expect(prisma.travelCoupon.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ reason: "Issued as goodwill by administrator" }) }),
    );
  });

  it("returns 500 on an unexpected error", async () => {
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error("db down"));

    const response = await POST(
      createRequest({ customerId: "cust-1", originalValue: 500, expiryDate: "2027-01-01" }),
    );
    expect(response.status).toBe(500);
  });
});
