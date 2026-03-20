import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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

  if (!booking?.slot) return;

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
    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
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

    // ─── Verification ────────────────────────────────────
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error("RAZORPAY_KEY_SECRET is not defined");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
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

    // Signature valid — check idempotency
    const existingBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { paymentStatus: true },
    });

    if (existingBooking?.paymentStatus === "PAID") {
      return NextResponse.json({
        success: true,
        bookingId,
        message: "Payment was already verified and booking confirmed.",
      });
    }

    // Confirm booking and payment
    try {
      const [updatedBooking] = await prisma.$transaction([
        prisma.booking.update({
          where: { id: bookingId, paymentStatus: { not: "PAID" } },
          data: { bookingStatus: "CONFIRMED", paymentStatus: "PAID" },
        }),
        prisma.payment.updateMany({
          where: { providerOrderId: razorpay_order_id, status: { not: "PAID" } },
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

      // Revalidate entire layout to refresh slot capacities and admin dashboards
      revalidatePath("/", "layout");

      // Send confirmation email (fire-and-forget — don't block the response)
      sendBookingConfirmationEmail(bookingId).catch((err) =>
        console.error("Background email error:", err),
      );

      return NextResponse.json({
        success: true,
        bookingId,
        message: "Payment verified and booking confirmed.",
      });
    } catch (txError: any) {
      // If the record was not found, it's likely already paid (idempotency)
      if (txError.code === 'P2025') {
        return NextResponse.json({
          success: true,
          bookingId,
          message: "Payment was already verified and booking confirmed.",
        });
      }
      throw txError;
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify payment." },
      { status: 500 },
    );
  }
}
