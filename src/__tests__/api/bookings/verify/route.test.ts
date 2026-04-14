import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("node:crypto", () => {
  const digest = vi.fn();
  const update = vi.fn(() => ({ digest }));
  const createHmac = vi.fn(() => ({ update }));
  return {
    default: { createHmac },
    createHmac,
    __mocks: { digest, update, createHmac },
  };
});

vi.mock("@/lib/api-auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/audit-logger", () => ({
  logActivity: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    booking: { findUnique: vi.fn() },
    payment: { updateMany: vi.fn() },
    platformSetting: { findUnique: vi.fn().mockResolvedValue({ value: "test_secret" }) },
  },
}));

vi.mock("@/services/booking.service", () => ({
  BookingService: { confirmPayment: vi.fn() },
}));

import crypto from "node:crypto";
import { POST } from "@/app/api/bookings/verify/route";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { BookingService } from "@/services/booking.service";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockBookingFindUnique = vi.mocked(prisma.booking.findUnique);
const mockPaymentUpdateMany = vi.mocked(prisma.payment.updateMany);
const mockConfirmPayment = vi.mocked(BookingService.confirmPayment);
const mockLogActivity = vi.mocked(logActivity);

const mockCreateHmac = vi.mocked((crypto as any).createHmac);

const createRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

const validBody = {
  razorpay_order_id: "order_1",
  razorpay_payment_id: "pay_1",
  razorpay_signature: "sig_ok",
  bookingId: "bk_1",
};

describe("POST /api/bookings/verify", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RAZORPAY_KEY_SECRET", "test_secret");
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockCreateHmac.mockReturnValue({
      update: vi
        .fn()
        .mockReturnValue({ digest: vi.fn().mockReturnValue("sig_ok") }),
    } as any);

    // Default to a pending booking owned by 'u1'
    mockBookingFindUnique.mockResolvedValue({
      userId: "u1",
      paymentStatus: "PENDING",
    } as any);

    // Default to authorized as 'u1'
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("returns 400 on validation failure", async () => {
    const response = await POST(createRequest({ bookingId: "" }));
    expect(response.status).toBe(400);
  });

  it("returns 500 when secret is missing", async () => {
    vi.stubEnv("RAZORPAY_KEY_SECRET", "");
    // mock platformSetting findUnique to return null for secret check
    const mockPlatformFindUnique = vi.mocked(prisma.platformSetting.findUnique);
    mockPlatformFindUnique.mockResolvedValueOnce(null);

    const response = await POST(createRequest(validBody));
    expect(response.status).toBe(500);
  });

  it("returns 400 for invalid signature and marks payment failed", async () => {
    mockCreateHmac.mockReturnValue({
      update: vi
        .fn()
        .mockReturnValue({ digest: vi.fn().mockReturnValue("different") }),
    } as any);

    const response = await POST(createRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid payment signature");
    expect(mockPaymentUpdateMany).toHaveBeenCalledWith({
      where: { providerOrderId: "order_1" },
      data: { status: "FAILED" },
    });
  });

  it("returns 403 when user does not own the booking", async () => {
    mockBookingFindUnique.mockResolvedValueOnce({
      userId: "different_user",
    } as any);

    const response = await POST(createRequest(validBody));
    expect(response.status).toBe(403);
  });

  it("confirms payment on success and orchestrates via BookingService", async () => {
    mockConfirmPayment.mockResolvedValueOnce({ id: "bk_1" } as any);

    const response = await POST(createRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockConfirmPayment).toHaveBeenCalledWith(
      "bk_1",
      "order_1",
      "pay_1",
      validBody
    );
    expect(mockLogActivity).toHaveBeenCalled();
  });

  it("returns 500 on unexpected error", async () => {
    mockBookingFindUnique.mockRejectedValueOnce(new Error("db down"));
    const response = await POST(createRequest(validBody));
    expect(response.status).toBe(500);
  });
});
