import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/audit-logger";
import { logError } from "@/lib/monitoring";

// Events worth actually surfacing -- delivery/open/click are just noise for
// our purposes; a bounce or spam complaint means a real customer isn't
// getting booking confirmations/receipts, which is worth knowing about.
const NOTABLE_EVENTS = new Set(["email.bounced", "email.complained", "email.delivery_delayed"]);

/**
 * Verifies a Resend webhook's Svix signature without adding the `svix`
 * package as a dependency for one endpoint -- the scheme is a documented,
 * simple HMAC: sign "{id}.{timestamp}.{body}" with the base64-decoded
 * webhook secret (after stripping its "whsec_" prefix), compare
 * timing-safely against any of the (space-separated, "v1,"-prefixed)
 * signatures in the svix-signature header.
 */
function verifySvixSignature(
  payload: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string,
): boolean {
  try {
    const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
    const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
    const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");

    return svixSignature
      .split(" ")
      .map((sig) => sig.split(",")[1])
      .filter(Boolean)
      .some((sig) => {
        const a = Buffer.from(sig);
        const b = Buffer.from(expected);
        return a.length === b.length && crypto.timingSafeEqual(a, b);
      });
  } catch {
    return false;
  }
}

/**
 * POST /api/webhooks/email
 *
 * Resend delivery-event webhook. Transactional email (password reset,
 * booking confirmation) previously failed silently on a bounce/complaint --
 * no retry, no alert, no visibility. This logs notable events to the audit
 * trail and reports them to Sentry so someone actually notices.
 *
 * Only covers the Resend provider (one of three configurable email
 * providers -- see src/lib/email/factory.ts). SMTP/Zoho bounce visibility
 * would need a separate mechanism on that side; out of scope here.
 *
 * Opt-in: no-ops entirely if the "Webhook Signing Secret" admin setting
 * (Settings → Communications, falling back to RESEND_WEBHOOK_SECRET for
 * pre-deploy bootstrapping) isn't configured, so this has zero effect
 * unless deliberately wired up in both the admin panel and the Resend
 * dashboard.
 */
export async function POST(request: NextRequest) {
  const setting = await prisma.platformSetting.findUnique({ where: { key: "resend_webhook_secret" } });
  const secret = setting?.value || process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 404 });
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing signature headers." }, { status: 400 });
  }

  const rawBody = await request.text();

  if (!verifySvixSignature(rawBody, svixId, svixTimestamp, svixSignature, secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  try {
    const event = JSON.parse(rawBody);
    const eventType = event?.type as string | undefined;

    // Webhooks are push-based -- there's no "ping" API to test connectivity
    // like Razorpay/Cloudinary/S3 have. Recording that *something* validly-
    // signed arrived is the only real health signal available, so the admin
    // UI can show "last event received" instead of a synthetic test button.
    await prisma.platformSetting.upsert({
      where: { key: "resend_webhook_last_event_at" },
      create: { key: "resend_webhook_last_event_at", value: new Date().toISOString() },
      update: { value: new Date().toISOString() },
    });

    if (eventType && NOTABLE_EVENTS.has(eventType)) {
      const recipient = event?.data?.to?.[0] ?? event?.data?.email ?? "unknown";
      console.warn(`[EmailWebhook] ${eventType} for ${recipient}`);

      await logActivity("EMAIL_DELIVERY_ISSUE", null, "Email", null, {
        eventType,
        recipient,
        subject: event?.data?.subject,
      });

      await logError(`Email delivery issue: ${eventType}`, {
        recipient,
        eventType,
        requestId: request.headers?.get("x-request-id"),
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[EmailWebhook] Failed to process event:", error);
    return NextResponse.json({ error: "Failed to process event." }, { status: 500 });
  }
}
