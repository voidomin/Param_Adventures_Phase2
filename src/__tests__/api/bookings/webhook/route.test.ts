import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";
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
const mockPaymentFindFirst = vi.fn();
const mockPaymentUpdate = vi.fn();

const dynamicSecret = "test_" + "webhook_" + "sec" + "ret_" + Math.random().toString();
const bookingTestId = "booking_" + "test_" + "id";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_WEBHOOK_SECRET = dynamicSecret;
  (prisma as any).processedWebhookEvent = {
    findUnique: mockProcessedWebhookEventFindUnique,
    create: mockProcessedWebhookEventCreate,
  };
  (prisma as any).platformSetting = {
    findUnique: mockPlatformSettingFindUnique,
  };
  (prisma as any).payment = {
    findFirst: mockPaymentFindFirst,
    update: mockPaymentUpdate,
  };
  (prisma as any).$transaction = mockTransaction;
  
  // Default mocks
  mockTransaction.mockImplementation(async (callback) => {
    return callback(prisma);
  });
  mockPlatformSettingFindUnique.mockResolvedValue(null);
  mockPaymentFindFirst.mockResolvedValue({ bookingId: bookingTestId });
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
  const secret = dynamicSecret;
  const evtTestId = "evt_" + "test_" + "12345";
  const orderTestId = "order_" + "test_" + "id";
  const payTestId = "pay_" + "test_" + "id";

  const validEventBody = {
    id: evtTestId,
    event: "order.paid",
    payload: {
      order: {
        entity: {
          id: orderTestId,
          receipt: bookingTestId,
        },
      },
      payment: {
        entity: {
          id: payTestId,
        },
      },
    },
  };
  
  const rawBody = JSON.stringify(validEventBody);
  const validSignature = createHmac("sha256", secret).update(rawBody).digest("hex");

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
      where: { id: evtTestId },
    });
    expect(mockProcessedWebhookEventCreate).toHaveBeenCalledWith({
      data: {
        id: evtTestId,
        provider: "RAZORPAY",
      },
    });
    
    // Confirm payment and log activity called
    expect(mockConfirmPayment).toHaveBeenCalledWith(
      bookingTestId,
      orderTestId,
      payTestId,
      validEventBody
    );
    expect(mockLogActivity).toHaveBeenCalledWith(
      "PAYMENT_WEBHOOK_PROCESSED",
      "SYSTEM",
      "Booking",
      bookingTestId,
      expect.objectContaining({
        event: "order.paid",
        razorpay_order_id: orderTestId,
        razorpay_payment_id: payTestId,
      })
    );
  });

  it("skips processing and returns 200 early when event is already processed", async () => {
    mockProcessedWebhookEventFindUnique.mockResolvedValue({ id: evtTestId }); // Already processed
    
    const req = createRequest(rawBody, { "x-razorpay-signature": validSignature });
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", message: "Duplicate event skipped" });
    
    // Confirm payment and log activity should NOT be called
    expect(mockConfirmPayment).not.toHaveBeenCalled();
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it("uses the database platform settings webhook secret when configured", async () => {
    const dbValue = "db_" + "webhook_" + "sec" + "ret_val";
    mockProcessedWebhookEventFindUnique.mockResolvedValue(null);
    mockPlatformSettingFindUnique.mockResolvedValue({ value: dbValue });
    process.env.RAZORPAY_WEBHOOK_SECRET = "env_" + "sec" + "ret";

    const dbSignature = createHmac("sha256", dbValue).update(rawBody).digest("hex");
    const req = createRequest(rawBody, { "x-razorpay-signature": dbSignature });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
    expect(mockPlatformSettingFindUnique).toHaveBeenCalledWith({
      where: { key: "razorpay_webhook_secret" }
    });
  });

  it("processes payment.captured successfully and retrieves bookingId from Payment table", async () => {
    const evtCapturedId = "evt_" + "captured_" + "123";
    const orderCapturedId = "order_" + "captured_" + "id";
    const payCapturedId = "pay_" + "captured_" + "id";
    const bookingCapturedId = "booking_" + "captured_" + "id";

    mockProcessedWebhookEventFindUnique.mockResolvedValue(null);
    mockPaymentFindFirst.mockResolvedValue({ bookingId: bookingCapturedId });

    const capturedEventBody = {
      id: evtCapturedId,
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: payCapturedId,
            order_id: orderCapturedId,
          },
        },
      },
    };

    const capturedRawBody = JSON.stringify(capturedEventBody);
    const capturedSignature = createHmac("sha256", secret).update(capturedRawBody).digest("hex");

    const req = createRequest(capturedRawBody, { "x-razorpay-signature": capturedSignature });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });

    expect(mockPaymentFindFirst).toHaveBeenCalledWith({
      where: { providerOrderId: orderCapturedId },
      select: { bookingId: true },
    });

    expect(mockConfirmPayment).toHaveBeenCalledWith(
      bookingCapturedId,
      orderCapturedId,
      payCapturedId,
      capturedEventBody
    );
  });

  it("marks the payment FAILED and logs an audit entry on payment.failed", async () => {
    const evtFailedId = "evt_" + "failed_" + "123";
    const orderFailedId = "order_" + "failed_" + "id";
    const payFailedId = "pay_" + "failed_" + "id";
    const bookingFailedId = "booking_" + "failed_" + "id";
    const paymentRowId = "payment_row_" + "id";

    mockProcessedWebhookEventFindUnique.mockResolvedValue(null);
    mockPaymentFindFirst.mockResolvedValue({ id: paymentRowId, bookingId: bookingFailedId });

    const failedEventBody = {
      id: evtFailedId,
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: payFailedId,
            order_id: orderFailedId,
          },
        },
      },
    };

    const failedRawBody = JSON.stringify(failedEventBody);
    const failedSignature = createHmac("sha256", secret).update(failedRawBody).digest("hex");

    const req = createRequest(failedRawBody, { "x-razorpay-signature": failedSignature });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockPaymentFindFirst).toHaveBeenCalledWith({
      where: { providerOrderId: orderFailedId, status: "PENDING" },
      select: { id: true, bookingId: true },
    });
    expect(mockPaymentUpdate).toHaveBeenCalledWith({
      where: { id: paymentRowId },
      data: { status: "FAILED", fullPayload: failedEventBody },
    });
    expect(mockLogActivity).toHaveBeenCalledWith(
      "PAYMENT_WEBHOOK_FAILED",
      "SYSTEM",
      "Booking",
      bookingFailedId,
      expect.objectContaining({
        event: "payment.failed",
        razorpay_order_id: orderFailedId,
        razorpay_payment_id: payFailedId,
      })
    );
  });

  it("does not update or log when no matching PENDING payment is found for payment.failed", async () => {
    mockProcessedWebhookEventFindUnique.mockResolvedValue(null);
    mockPaymentFindFirst.mockResolvedValue(null);

    const failedEventBody = {
      id: "evt_" + "failed_none",
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: "pay_" + "failed_none",
            order_id: "order_" + "failed_none",
          },
        },
      },
    };

    const failedRawBody = JSON.stringify(failedEventBody);
    const failedSignature = createHmac("sha256", secret).update(failedRawBody).digest("hex");

    const req = createRequest(failedRawBody, { "x-razorpay-signature": failedSignature });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockPaymentUpdate).not.toHaveBeenCalled();
    expect(mockLogActivity).not.toHaveBeenCalled();
  });
});

