import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { BookingService } from "@/services/booking.service";
import { logActivity } from "@/lib/audit-logger";

import { webhookLimiter } from "@/lib/rate-limiter";

/**
 * POST /api/bookings/webhook
 * 
 * Server-to-Server endpoint for Razorpay payment notifications.
 * SECURE: Uses HMAC-SHA256 signature verification and Rate Limiting.
 * PUBLIC: No JWT authentication (Razorpay call).
 */
export async function POST(request: NextRequest) {
  // 0. Rate Limiting Protection (Abuse Prevention)
  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
  const rateLimit = webhookLimiter.check(ip);
  
  if (!rateLimit.success) {
    console.warn(`⚠️ [Webhook] Rate limit exceeded for IP: ${ip}`);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.reset.toString()
        }
      }
    );
  }

  try {
    // 1. Capture Raw Body for Signature Verification
    // We need the exact string payload to verify the HMAC hash.
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // 2. Fetch Webhook Secret
    const secretSetting = await prisma.platformSetting.findUnique({
      where: { key: "razorpay_webhook_secret" }
    });
    const secret = secretSetting?.value || process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.error("[Webhook] RAZORPAY_WEBHOOK_SECRET is not configured.");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // 3. Verify Signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.warn("[Webhook] Invalid signature received from IP:", request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // 4. Process Event
    const eventBody = JSON.parse(rawBody);
    const eventType = eventBody.event;
    const { payload } = eventBody;

    console.log(`[Webhook] Received Razorpay Event: ${eventType}`);

    // LOGIC: Capture IP for forensics
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    switch (eventType) {
      case "order.paid": {
        const order = payload.order.entity;
        const payment = payload.payment.entity;
        const bookingId = order.receipt; // We use bookingId as receipt during order creation

        if (!bookingId) {
          console.error("[Webhook] order.paid event missing receipt (bookingId). Order ID:", order.id);
          break;
        }

        // Trigger shared confirmation logic
        await BookingService.confirmPayment(
          bookingId, 
          order.id, 
          payment.id, 
          eventBody
        );

        await logActivity(
          "PAYMENT_WEBHOOK_PROCESSED",
          "SYSTEM",
          "Booking",
          bookingId,
          { 
            event: eventType, 
            razorpay_order_id: order.id, 
            razorpay_payment_id: payment.id,
            ip
          }
        );
        break;
      }

      case "payment.failed": {
        const payment = payload.payment.entity;
        const orderId = payment.order_id;

        if (orderId) {
          await prisma.payment.updateMany({
            where: { providerOrderId: orderId, status: "PENDING" },
            data: { status: "FAILED", fullPayload: eventBody }
          });
          
          console.log(`[Webhook] Payment failure recorded for Order: ${orderId}`);
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${eventType}`);
    }

    // Always respond 200 OK to Razorpay to prevent retries
    return NextResponse.json({ status: "ok" });

  } catch (error) {
    console.error("[Webhook] Critical Error:", error);
    // Even on error, we might want to return 200 to Razorpay if it's a "permanent" failure
    // so they stop retrying, but for now 500 is safer for debugging.
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
