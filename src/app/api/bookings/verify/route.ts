import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { sendBookingConfirmation } from "@/lib/email";
import { logActivity } from "@/lib/audit-logger";

/**
 * Fetches full booking details and sends a confirmation email.
 */
async function sendBookingConfirmationEmail(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { name: true, email: true } },
      experience: { select: { title: true } },
      slot: { select: { date: true } },
    },
  });

  if (!booking || !booking.slot) return;

  await sendBookingConfirmation({
    userName: booking.user.name,
    userEmail: booking.user.email,
    experienceTitle: booking.experience.title,
    slotDate: booking.slot.date.toISOString(),
    participantCount: booking.participantCount,
    totalPrice: Number(booking.totalPrice),
    bookingId: booking.id,
  });
}

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
    const [updatedBooking] = await prisma.$transaction([
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

    await logActivity(
      "BOOKING_CONFIRMED",
      updatedBooking.userId,
      "Booking",
      bookingId,
      { paymentId: razorpay_payment_id },
    );

    // Send confirmation email (fire-and-forget — don't block the response)
    sendBookingConfirmationEmail(bookingId).catch((err) =>
      console.error("Background email error:", err),
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
