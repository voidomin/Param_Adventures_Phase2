import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/bookings/verify/route";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";
import crypto from "node:crypto";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    platformSetting: {
      findUnique: vi.fn(),
    },
    payment: {
      updateMany: vi.fn(),
    },
    booking: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/email", () => ({ sendBookingConfirmation: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("Payment Verification Authority Shield", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  const createRequest = (body: any) => {
    return new NextRequest("http://localhost/api/bookings/verify", {
      method: "POST",
      body: JSON.stringify(body),
    });
  };

  it("should prioritize Database Secret over Environment Secret (Authority Test)", async () => {
    // 1. Setup Database Secret
    const DB_SECRET = "db_secret_authority_123";
    (prisma.platformSetting.findUnique as any).mockResolvedValue({
      key: "razorpay_key_secret",
      value: DB_SECRET,
    });

    // 2. Setup Env Secret (different from DB)
    process.env.RAZORPAY_KEY_SECRET = "env_secret_fallback_456";

    // 3. Create payload signed with DB_SECRET
    const order_id = "order_abc";
    const payment_id = "pay_xyz";
    const signature = crypto
      .createHmac("sha256", DB_SECRET)
      .update(`${order_id}|${payment_id}`)
      .digest("hex");

    const body = {
      razorpay_order_id: order_id,
      razorpay_payment_id: payment_id,
      razorpay_signature: signature,
      bookingId: "booking_123",
    };

    // 4. Mock other DB calls to stop execution after signature check
    (prisma.booking.findUnique as any).mockResolvedValue({ paymentStatus: "PENDING" });
    (prisma.payment.updateMany as any).mockResolvedValue({ count: 1 });

    // 5. Execute
    const response = await POST(createRequest(body));

    // 6. Verification
    // If it used DB_SECRET, signature matches -> 200 (or continued execution)
    // If it used ENV_SECRET, signature mismatch -> 400
    expect(response.status).not.toBe(400); 
    expect(prisma.platformSetting.findUnique).toHaveBeenCalledWith({
      where: { key: "razorpay_key_secret" },
    });
  });

  it("should fallback to Environment Secret if Database Secret is missing", async () => {
    // 1. Setup Database Secret MISSING
    (prisma.platformSetting.findUnique as any).mockResolvedValue(null);

    // 2. Setup Env Secret
    const ENV_SECRET = "env_secret_fallback_456";
    process.env.RAZORPAY_KEY_SECRET = ENV_SECRET;

    // 3. Create payload signed with ENV_SECRET
    const order_id = "order_abc";
    const payment_id = "pay_xyz";
    const signature = crypto
      .createHmac("sha256", ENV_SECRET)
      .update(`${order_id}|${payment_id}`)
      .digest("hex");

    const body = {
      razorpay_order_id: order_id,
      razorpay_payment_id: payment_id,
      razorpay_signature: signature,
      bookingId: "booking_123",
    };

    // 4. Mock other DB calls
    (prisma.booking.findUnique as any).mockResolvedValue({ paymentStatus: "PENDING" });

    // 5. Execute
    const response = await POST(createRequest(body));

    // 6. Verification
    expect(response.status).not.toBe(400); // Success means it used the ENV_SECRET fallback
  });
});
