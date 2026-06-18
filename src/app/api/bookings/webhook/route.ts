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
async function processWebhookEvent(eventType: string, eventBody: any, forensicsIp: string) {
  const { payload } = eventBody;
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
          ip: forensicsIp
        }
      );
      break;
    }
    case "payment.captured": {
      const payment = payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;

      if (!orderId) {
        console.error("[Webhook] payment.captured event missing order_id. Payment ID:", paymentId);
        break;
      }

      const paymentRecord = await prisma.payment.findFirst({
        where: { providerOrderId: orderId },
        select: { bookingId: true }
      });

      const bookingId = paymentRecord?.bookingId || payment.notes?.bookingId || payment.notes?.booking_id;

      if (!bookingId) {
        console.error("[Webhook] payment.captured could not find bookingId for Order ID:", orderId);
        break;
      }

      await BookingService.confirmPayment(
        bookingId, 
        orderId, 
        paymentId, 
        eventBody
      );

      await logActivity(
        "PAYMENT_WEBHOOK_PROCESSED",
        "SYSTEM",
        "Booking",
        bookingId,
        { 
          event: eventType, 
          razorpay_order_id: orderId, 
          razorpay_payment_id: paymentId,
          ip: forensicsIp
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
}

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
      
      try {
        let eventBody: any = null;
        try {
          eventBody = JSON.parse(rawBody);
        } catch {}

        await logActivity(
          "PAYMENT_WEBHOOK_SIGNATURE_INVALID",
          "SYSTEM",
          "Booking",
          eventBody?.id || null,
          {
            signature,
            expectedSignature,
            ip: request.headers.get("x-forwarded-for") || "unknown",
            bodyLength: rawBody.length,
            event: eventBody?.event || null,
            orderId: eventBody?.payload?.payment?.entity?.order_id || eventBody?.payload?.order?.entity?.id || null
          }
        );
      } catch (logErr) {
        console.error("[Webhook] Failed to log signature failure to DB:", logErr);
      }

      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // 4. Process Event
    const eventBody = JSON.parse(rawBody);
    const eventType = eventBody.event;

    console.log(`[Webhook] Received Razorpay Event: ${eventType}`);

    // Deduplication check to prevent duplicate payment processing
    const eventId = eventBody.id;
    if (eventId) {
      const isAlreadyProcessed = await prisma.$transaction(async (tx) => {
        const existing = await tx.processedWebhookEvent.findUnique({
          where: { id: eventId }
        });
        if (existing) {
          return true;
        }
        await tx.processedWebhookEvent.create({
          data: {
            id: eventId,
            provider: "RAZORPAY"
          }
        });
        return false;
      });

      if (isAlreadyProcessed) {
        console.log(`[Webhook] Duplicate event detected and skipped: ${eventId}`);
        return NextResponse.json({ status: "ok", message: "Duplicate event skipped" });
      }
    }

    // LOGIC: Capture IP for forensics
    const forensicsIp = request.headers.get("x-forwarded-for") || "unknown";

    await processWebhookEvent(eventType, eventBody, forensicsIp);

    // Always respond 200 OK to Razorpay to prevent retries
    return NextResponse.json({ status: "ok" });

  } catch (error) {
    console.error("[Webhook] Critical Error:", error);
    // Even on error, we might want to return 200 to Razorpay if it's a "permanent" failure
    // so they stop retrying, but for now 500 is safer for debugging.
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
