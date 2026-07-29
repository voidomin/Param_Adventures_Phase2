import { NextResponse, NextRequest } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import Razorpay from "razorpay";
import { v2 as cloudinary } from "cloudinary";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";

interface VerifyConfig {
  keyId?: string;
  keySecret?: string;
  cloudName?: string;
  apiKey?: string;
  apiSecret?: string;
  bucket?: string;
  region?: string;
  accessKey?: string;
  secretKey?: string;
  endpoint?: string;
  clientId?: string;
}

/**
 * Handlers for different verification types
 */
const handlers: Record<string, (config: VerifyConfig) => Promise<unknown>> = {
  RAZORPAY: async (config) => {
    const { keyId, keySecret } = config;
    if (!keyId || !keySecret) throw new Error("Key ID and Secret are required for Razorpay");
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    await razorpay.payments.all({ count: 1 });
    return { success: true, message: "Razorpay handshake successful! Connectivity verified." };
  },

  RAZORPAY_ORDER: async (config) => {
    const { keyId, keySecret } = config;
    if (!keyId || !keySecret) throw new Error("Key ID and Secret are required for Razorpay test order");
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await razorpay.orders.create({
      amount: 100, // ₹1
      currency: "INR",
      receipt: `test_receipt_${Date.now()}`,
    });
    return {
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    };
  },

  CLOUDINARY: async (config) => {
    const { cloudName, apiKey, apiSecret } = config;
    if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloud Name, API Key, and Secret are required for Cloudinary");
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
    const result = await cloudinary.api.ping();
    if (result.status !== "ok") throw new Error("Cloudinary returned non-ok status");
    return { success: true, message: "Cloudinary connection successful!" };
  },

  S3: async (config) => {
    const { bucket, region, accessKey, secretKey, endpoint } = config;
    if (!bucket || !region || !accessKey || !secretKey) throw new Error("Bucket, Region, Access Key, and Secret are required for S3");
    const s3Client = new S3Client({
      region,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      endpoint: endpoint || undefined,
      forcePathStyle: !!endpoint,
    });
    await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
    return { success: true, message: "S3 Bucket accessibility verified!" };
  },

  TURNSTILE: async (config) => {
    const { secretKey } = config;
    if (!secretKey) throw new Error("Secret Key is required for Turnstile");

    // Cloudflare's siteverify endpoint doesn't have a dedicated "is this
    // secret valid" check, but it distinguishes a bad secret from a bad
    // token in its error codes -- send a deliberately fake token and read
    // which one Cloudflare complains about.
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: secretKey, response: "verification-check-placeholder-token" }),
    });
    const data = await response.json();
    const errorCodes: string[] = data?.["error-codes"] ?? [];

    if (errorCodes.includes("invalid-input-secret") || errorCodes.includes("missing-input-secret")) {
      throw new Error("Cloudflare rejected this Secret Key. Double-check it in the Turnstile dashboard.");
    }

    return {
      success: true,
      message: "Secret Key accepted by Cloudflare. (Full widget verification happens on the next real form submission.)",
    };
  },

  GOOGLE_SIGNIN: async (config) => {
    const { clientId } = config;
    if (!clientId) throw new Error("Client ID is required for Google Sign-In");

    if (!/^\d+-[0-9a-zA-Z_]+\.apps\.googleusercontent\.com$/.test(clientId)) {
      throw new Error("Client ID doesn't match Google's expected format (should end in .apps.googleusercontent.com)");
    }

    // Google has no public "does this client exist" API, but its own
    // authorization endpoint distinguishes "invalid_client" (client_id not
    // found) from other errors (e.g. an unregistered redirect_uri, expected
    // here since we're using a placeholder) -- read the served page for
    // that specific signal without ever completing a real sign-in.
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid");
    authUrl.searchParams.set("redirect_uri", "https://param-adventures-verification-check.invalid/callback");

    const response = await fetch(authUrl.toString(), { redirect: "manual" });
    const text = await response.text();

    if (/invalid_client/i.test(text) || /oauth client was not found/i.test(text)) {
      throw new Error("Google rejected this Client ID (invalid_client). Double-check it in Google Cloud Console.");
    }

    return {
      success: true,
      message: "Client ID recognized by Google. (Full sign-in flow still needs testing the live button.)",
    };
  },
};

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeRequest(request, ["system:config"]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { type, config } = await request.json();
    if (!type || !config) {
      return NextResponse.json({ error: "Missing verification type or configuration" }, { status: 400 });
    }

    const handler = handlers[type];
    if (!handler) {
      return NextResponse.json({ error: "Unsupported verification type" }, { status: 400 });
    }

    const result = await handler(config);
    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error("System verify error:", error);
    const message = error instanceof Error ? error.message : "Verification failed";
    const status = message.includes("required") || message.includes("Missing") ? 400 : 502;
    return NextResponse.json(
      { error: message },
      { status: status === 400 ? 400 : 502 },
    );
  }
}
