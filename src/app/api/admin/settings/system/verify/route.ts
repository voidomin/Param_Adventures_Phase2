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
