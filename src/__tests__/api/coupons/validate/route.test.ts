import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/coupon-engine", () => ({ validateCoupon: vi.fn() }));

import { POST } from "@/app/api/coupons/validate/route";
import { authorizeRequest } from "@/lib/api-auth";
import { validateCoupon } from "@/lib/coupon-engine";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockValidateCoupon = vi.mocked(validateCoupon);
const createRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

const validCoupon = { id: "c1", code: "PARAM-ABC", balance: 500, expiryDate: new Date("2027-01-01") };

describe("POST /api/coupons/validate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
  });

  it("returns the auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false, response: { status: 401 } } as any);

    const response = await POST(createRequest({ code: "PARAM-ABC" }));
    expect((response as any).status).toBe(401);
  });

  it("returns 400 for an invalid body", async () => {
    const response = await POST(createRequest({ code: "" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when the coupon engine reports an error", async () => {
    mockValidateCoupon.mockResolvedValue({ coupon: null, error: "Coupon expired" } as any);

    const response = await POST(createRequest({ code: "PARAM-ABC" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Coupon expired");
  });

  it("returns the coupon details when valid and no payment amount is given", async () => {
    mockValidateCoupon.mockResolvedValue({ coupon: validCoupon, error: null } as any);

    const response = await POST(createRequest({ code: "PARAM-ABC" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      coupon: { id: "c1", code: "PARAM-ABC", balance: 500, expiryDate: validCoupon.expiryDate.toISOString() },
    });
  });

  it("rejects when the coupon balance exceeds the payment amount", async () => {
    mockValidateCoupon.mockResolvedValue({ coupon: validCoupon, error: null } as any);

    const response = await POST(createRequest({ code: "PARAM-ABC", paymentAmount: 100 }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("cannot exceed");
  });

  it("rejects when the remaining balance would fall between 0 and 1", async () => {
    mockValidateCoupon.mockResolvedValue({ coupon: validCoupon, error: null } as any);

    const response = await POST(createRequest({ code: "PARAM-ABC", paymentAmount: 500.5 }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("below the minimum online payment");
  });

  it("accepts a payment amount that fully covers the coupon with no leftover", async () => {
    mockValidateCoupon.mockResolvedValue({ coupon: validCoupon, error: null } as any);

    const response = await POST(createRequest({ code: "PARAM-ABC", paymentAmount: 500 }));
    expect(response.status).toBe(200);
  });

  it("returns 500 on an unexpected error", async () => {
    mockValidateCoupon.mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest({ code: "PARAM-ABC" }));
    expect(response.status).toBe(500);
  });
});
