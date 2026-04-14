import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/audit-logger";
import { BookingService } from "@/services/booking.service";
import { z } from "zod";

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1, "razorpay_order_id is required"),
  razorpay_payment_id: z.string().min(1, "razorpay_payment_id is required"),
  razorpay_signature: z.string().min(1, "razorpay_signature is required"),
  bookingId: z.string().min(1, "bookingId is required"),
});

/**
 * POST /api/bookings/verify — Verify Razorpay payment signature.
 *
 * Called by the frontend after Razorpay checkout completes.
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication & Session Security
    const auth = await authorizeRequest(request);
    if (!auth.authorized) return auth.response;

    const body = await request.json();

    // 2. Schema Validation
    const parseResult = verifySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId,
    } = parseResult.data;

    // 3. Ownership Check: Ensure the user owns this booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { userId: true, paymentStatus: true }
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (booking.userId !== auth.userId) {
      console.warn(`🛑 Unauthorized payment verification attempt by User ${auth.userId}`);
      return NextResponse.json({ error: "Unauthorized access to this booking." }, { status: 403 });
    }

    // 4. HMAC Signature Verification
    const secretSetting = await prisma.platformSetting.findUnique({
      where: { key: "razorpay_key_secret" }
    });
    const secret = secretSetting?.value || process.env.RAZORPAY_KEY_SECRET;
    
    if (!secret) {
      console.error("[VerifyAPI] Razorpay secret is missing.");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      // Record failure for audit
      await prisma.payment.updateMany({
        where: { providerOrderId: razorpay_order_id },
        data: { status: "FAILED" },
      });
      return NextResponse.json({ error: "Invalid payment signature." }, { status: 400 });
    }

    // 5. Shared Confirmation Orchestration
    // This utilizes the same battle-hardened logic as the Webhook.
    await BookingService.confirmPayment(
      bookingId,
      razorpay_order_id,
      razorpay_payment_id,
      body
    );

    await logActivity(
      "BOOKING_CONFIRMED",
      auth.userId,
      "Booking",
      bookingId,
      { paymentId: razorpay_payment_id, origin: "FRONTEND_VERIFY" },
    );

    return NextResponse.json({
      success: true,
      bookingId,
      message: "Payment verified and booking confirmed.",
    });

  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify payment." },
      { status: 500 },
    );
  }
}
