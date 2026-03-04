import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * POST /api/bookings/verify — Verify Razorpay payment signature.
 *
 * Called by the frontend after Razorpay checkout completes.
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId,
    } = body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !bookingId
    ) {
      return NextResponse.json(
        { error: "Missing required payment fields." },
        { status: 400 },
      );
    }

    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      // Signature mismatch — payment is invalid
      await prisma.payment.updateMany({
        where: { providerOrderId: razorpay_order_id },
        data: { status: "FAILED" },
      });
      return NextResponse.json(
        { error: "Invalid payment signature." },
        { status: 400 },
      );
    }

    // Signature valid — confirm booking and payment
    await prisma.$transaction([
      prisma.booking.update({
        where: { id: bookingId },
        data: { bookingStatus: "CONFIRMED", paymentStatus: "PAID" },
      }),
      prisma.payment.updateMany({
        where: { providerOrderId: razorpay_order_id },
        data: {
          status: "PAID",
          providerPaymentId: razorpay_payment_id,
          fullPayload: body,
        },
      }),
    ]);

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
