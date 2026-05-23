import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/bookings/webhook/route";
import { prisma } from "@/lib/db";
import { BookingService } from "@/services/booking.service";
import { logActivity } from "@/lib/audit-logger";

vi.mock("@/services/booking.service", () => ({
  BookingService: {
    confirmPayment: vi.fn(),
  },
}));

vi.mock("@/lib/audit-logger", () => ({
  logActivity: vi.fn(),
}));

vi.mock("@/lib/rate-limiter", () => ({
  webhookLimiter: {
    check: vi.fn().mockReturnValue({ success: true, limit: 100, remaining: 99, reset: 0 }),
  },
}));

const mockConfirmPayment = vi.mocked(BookingService.confirmPayment);
const mockLogActivity = vi.mocked(logActivity);

// Set up mock methods on the prisma mock from vitest.setup.shared.ts
const mockPlatformSettingFindUnique = vi.fn();
const mockProcessedWebhookEventFindUnique = vi.fn();
const mockProcessedWebhookEventCreate = vi.fn();
const mockTransaction = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (prisma as any).platformSetting = {
    findUnique: mockPlatformSettingFindUnique,
  };
  (prisma as any).processedWebhookEvent = {
    findUnique: mockProcessedWebhookEventFindUnique,
    create: mockProcessedWebhookEventCreate,
  };
  (prisma as any).$transaction = mockTransaction;
  
  // Default mocks
  mockPlatformSettingFindUnique.mockResolvedValue({ value: "test_secret" });
  mockTransaction.mockImplementation(async (callback) => {
    return callback(prisma);
  });
});

function createRequest(body: string, headers: Record<string, string>) {
  return new NextRequest("http://localhost/api/bookings/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: body,
  });
}

describe("POST /api/bookings/webhook", () => {
  const secret = "test_secret";
  const validEventBody = {
    id: "evt_test_12345",
    event: "order.paid",
    payload: {
      order: {
        entity: {
          id: "order_test_id",
          receipt: "booking_test_id",
        },
      },
      payment: {
        entity: {
          id: "pay_test_id",
        },
      },
    },
  };
  
  const rawBody = JSON.stringify(validEventBody);
  const validSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  it("returns 400 when signature header is missing", async () => {
    const req = createRequest(rawBody, {});
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing signature" });
  });

  it("returns 400 when signature is invalid", async () => {
    const req = createRequest(rawBody, { "x-razorpay-signature": "invalid_sig" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid signature" });
  });

  it("processes order.paid successfully and saves webhook event ID", async () => {
    mockProcessedWebhookEventFindUnique.mockResolvedValue(null); // Not processed yet
    
    const req = createRequest(rawBody, { "x-razorpay-signature": validSignature });
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
    
    // Check transaction and DB calls
    expect(mockTransaction).toHaveBeenCalled();
    expect(mockProcessedWebhookEventFindUnique).toHaveBeenCalledWith({
      where: { id: "evt_test_12345" },
    });
    expect(mockProcessedWebhookEventCreate).toHaveBeenCalledWith({
      data: {
        id: "evt_test_12345",
        provider: "RAZORPAY",
      },
    });
    
    // Confirm payment and log activity called
    expect(mockConfirmPayment).toHaveBeenCalledWith(
      "booking_test_id",
      "order_test_id",
      "pay_test_id",
      validEventBody
    );
    expect(mockLogActivity).toHaveBeenCalledWith(
      "PAYMENT_WEBHOOK_PROCESSED",
      "SYSTEM",
      "Booking",
      "booking_test_id",
      expect.objectContaining({
        event: "order.paid",
        razorpay_order_id: "order_test_id",
        razorpay_payment_id: "pay_test_id",
      })
    );
  });

  it("skips processing and returns 200 early when event is already processed", async () => {
    mockProcessedWebhookEventFindUnique.mockResolvedValue({ id: "evt_test_12345" }); // Already processed
    
    const req = createRequest(rawBody, { "x-razorpay-signature": validSignature });
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", message: "Duplicate event skipped" });
    
    // Confirm payment and log activity should NOT be called
    expect(mockConfirmPayment).not.toHaveBeenCalled();
    expect(mockLogActivity).not.toHaveBeenCalled();
  });
});
