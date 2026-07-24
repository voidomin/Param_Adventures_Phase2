import Razorpay from "razorpay";
import { prisma } from "./db";

let razorpayInstance: Razorpay | null = null;
let lastUsedKeyId: string | null = null;

/**
 * Returns a singleton instance of Razorpay, initialized lazily from the database.
 * If keys change in the database, a new instance is created.
 */
export async function getRazorpay() {
  // Fetch keys from platform settings
  const settings = await prisma.platformSetting.findMany({
    where: {
      key: { in: ["razorpay_key_id", "razorpay_key_secret"] }
    }
  });

  const keyId = settings.find(s => s.key === "razorpay_key_id")?.value || process.env.RAZORPAY_KEY_ID;
  const keySecret = settings.find(s => s.key === "razorpay_key_secret")?.value || process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    // Allowlist, not a denylist: only known-safe local dev/test environments may
    // silently fall back to a dummy gateway. Anything else (production, staging,
    // or an unset/misconfigured NODE_ENV) fails loudly instead of quietly taking
    // "payments" that will never actually charge a customer.
    const isSafeForDummyFallback = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
    if (!isSafeForDummyFallback) {
      throw new Error("Razorpay configuration is missing in both database and environment.");
    }
    // Dummy instance for development if nothing is found
    return new Razorpay({
      key_id: "dummy_id",
      key_secret: "dummy_secret",
    });
  }

  // If the key has changed since the last time we created an instance, we need a fresh one
  if (razorpayInstance && lastUsedKeyId === keyId) {
    return razorpayInstance;
  }

  lastUsedKeyId = keyId;
  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpayInstance;
}
