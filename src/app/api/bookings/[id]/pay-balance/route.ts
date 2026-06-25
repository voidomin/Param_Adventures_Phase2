import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { getRazorpay } from "@/lib/razorpay";
import { BookingRepo } from "@/repositories/booking.repo";
import { logActivity } from "@/lib/audit-logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  const { id: bookingId } = await params;
  const userId = auth.userId;

  try {
    // 1. Fetch booking and verify ownership and balance
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        experience: { select: { title: true } }
      }
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    // Allow user who created the booking to pay
    if (booking.userId !== userId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (booking.bookingStatus === "CANCELLED") {
      return NextResponse.json({ error: "Booking is cancelled." }, { status: 400 });
    }

    const remaining = Number(booking.remainingBalance);
    if (remaining <= 0.01) {
      return NextResponse.json({ error: "Booking is already fully paid." }, { status: 400 });
    }

    // 2. Create the PENDING payment record in DB first
    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        provider: "RAZORPAY",
        providerOrderId: "PENDING_AUTH",
        amount: remaining,
        currency: "INR",
        status: "PENDING",
      }
    });

    // 3. Create Razorpay order
    const razorpay = await getRazorpay();
    const amountPaise = Math.round(remaining * 100);

    const keyIdSetting = await BookingRepo.getRazorpayKeyId(prisma);
    const keyId = keyIdSetting?.value || process.env.RAZORPAY_KEY_ID;

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: booking.id,
      notes: {
        bookingId: booking.id,
        experienceId: booking.experienceId,
        userId,
        paymentId: payment.id,
        purpose: "BALANCE_PAYMENT",
      },
    });

    // 4. Update the payment with actual providerOrderId
    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerOrderId: order.id }
    });

    await logActivity("BOOKING_BALANCE_PAYMENT_REQUESTED", userId, "Booking", booking.id, {
      orderId: order.id,
      amount: remaining,
    });

    return NextResponse.json({
      bookingId: booking.id,
      orderId: order.id,
      amount: amountPaise,
      currency: "INR",
      keyId,
    });

  } catch (error: unknown) {
    console.error("Booking balance payment error:", error);
    return NextResponse.json(
      { error: "Failed to initiate balance payment." },
      { status: 500 }
    );
  }
}
