import Razorpay from "razorpay";

let razorpayInstance: Razorpay | null = null;

/**
 * Returns a singleton instance of Razorpay, initialized lazily.
 * This prevents build-time errors when environment variables are missing.
 */
export function getRazorpay() {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing.");
    }
    return new Razorpay({
      key_id: "dummy",
      key_secret: "dummy",
    });
  }

  razorpayInstance ??= new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
  return razorpayInstance;
}
