import { beforeEach, describe, expect, it, vi } from "vitest";
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

vi.mock("@/lib/email", () => ({
  sendBookingConfirmation: vi.fn(),
}));

vi.mock("@/lib/audit-logger", () => ({
  logActivity: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    booking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import crypto from "node:crypto";
import { POST } from "@/app/api/bookings/verify/route";
import { prisma } from "@/lib/db";
import { sendBookingConfirmation } from "@/lib/email";
import { logActivity } from "@/lib/audit-logger";
import { revalidatePath } from "next/cache";

const mockBookingFindUnique = vi.mocked(prisma.booking.findUnique);
const mockBookingUpdate = vi.mocked(prisma.booking.update);
const mockPaymentUpdateMany = vi.mocked(prisma.payment.updateMany);
const mockTransaction = vi.mocked(prisma.$transaction);
const mockSendBookingConfirmation = vi.mocked(sendBookingConfirmation);
const mockLogActivity = vi.mocked(logActivity);
const mockRevalidatePath = vi.mocked(revalidatePath);

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
      update: vi.fn().mockReturnValue({ digest: vi.fn().mockReturnValue("sig_ok") }),
    } as any);
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

    const response = await POST(createRequest(validBody));

    expect(response.status).toBe(500);
  });

  it("returns 400 for invalid signature and marks payment failed", async () => {
    mockCreateHmac.mockReturnValue({
      update: vi.fn().mockReturnValue({ digest: vi.fn().mockReturnValue("different") }),
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

  it("returns success when booking is already paid", async () => {
    mockBookingFindUnique.mockResolvedValueOnce({ paymentStatus: "PAID" } as any);

    const response = await POST(createRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("already verified");
  });

  it("confirms payment and booking on success", async () => {
    mockBookingFindUnique
      .mockResolvedValueOnce({ paymentStatus: "PENDING" } as any)
      .mockResolvedValueOnce({
        id: "bk_1",
        participantCount: 2,
        totalPrice: 1999,
        user: { name: "User", email: "u@example.com" },
        experience: { title: "Trip" },
        slot: { date: new Date("2026-01-01") },
      } as any);

    mockTransaction.mockResolvedValueOnce([
      { id: "bk_1", userId: "u1" },
      { count: 1 },
    ] as any);

    mockLogActivity.mockResolvedValue(undefined);
    mockSendBookingConfirmation.mockResolvedValue(undefined as any);

    const response = await POST(createRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("Payment verified");
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: "bk_1", paymentStatus: { not: "PAID" } },
      data: { bookingStatus: "CONFIRMED", paymentStatus: "PAID" },
    });
    expect(mockPaymentUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { providerOrderId: "order_1", status: { not: "PAID" } },
      }),
    );
    expect(mockLogActivity).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("treats P2025 as idempotent success", async () => {
    mockBookingFindUnique.mockResolvedValueOnce({ paymentStatus: "PENDING" } as any);
    mockTransaction.mockRejectedValueOnce({ code: "P2025" });

    const response = await POST(createRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("already verified");
  });

  it("returns 500 when transaction fails with non-idempotent error", async () => {
    mockBookingFindUnique.mockResolvedValueOnce({ paymentStatus: "PENDING" } as any);
    mockTransaction.mockRejectedValueOnce({ code: "P9999" });

    const response = await POST(createRequest(validBody));

    expect(response.status).toBe(500);
  });

  it("logs background email failures without failing response", async () => {
    mockBookingFindUnique
      .mockResolvedValueOnce({ paymentStatus: "PENDING" } as any)
      .mockResolvedValueOnce({
        id: "bk_1",
        participantCount: 2,
        totalPrice: 1999,
        user: { name: "User", email: "u@example.com" },
        experience: { title: "Trip" },
        slot: { date: new Date("2026-01-01") },
      } as any);

    mockTransaction.mockResolvedValueOnce([
      { id: "bk_1", userId: "u1" },
      { count: 1 },
    ] as any);

    mockLogActivity.mockResolvedValue(undefined);
    mockSendBookingConfirmation.mockRejectedValueOnce(new Error("smtp down"));

    const response = await POST(createRequest(validBody));
    expect(response.status).toBe(200);

    // allow fire-and-forget catch handler to run
    await Promise.resolve();
    await Promise.resolve();

    expect(errorSpy).toHaveBeenCalledWith(
      "Background email error:",
      expect.any(Error),
    );
  });

  it("skips confirmation email when booking details have no slot", async () => {
    mockBookingFindUnique
      .mockResolvedValueOnce({ paymentStatus: "PENDING" } as any)
      .mockResolvedValueOnce({
        id: "bk_1",
        participantCount: 2,
        totalPrice: 1999,
        user: { name: "User", email: "u@example.com" },
        experience: { title: "Trip" },
        slot: null,
      } as any);

    mockTransaction.mockResolvedValueOnce([
      { id: "bk_1", userId: "u1" },
      { count: 1 },
    ] as any);

    mockLogActivity.mockResolvedValue(undefined);

    const response = await POST(createRequest(validBody));
    expect(response.status).toBe(200);

    await Promise.resolve();
    await Promise.resolve();

    expect(mockSendBookingConfirmation).not.toHaveBeenCalled();
  });

  it("returns 500 on unexpected error", async () => {
    mockBookingFindUnique.mockRejectedValueOnce(new Error("db down"));

    const response = await POST(createRequest(validBody));

    expect(response.status).toBe(500);
  });
});
