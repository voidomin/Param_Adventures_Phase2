import Razorpay from "razorpay";

let razorpayInstance: Razorpay | null = null;

/**
 * Returns a singleton instance of Razorpay, initialized lazily.
 * This prevents build-time errors when environment variables are missing.
 */
export function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing.");
    }
    // Return a dummy instance or null during build/dev
    // Note: returning null might cause issues if methods are called immediately, 
    // but the goal here is to prevent the constructor from crashing during module import.
    return new Razorpay({
      key_id: "dummy",
      key_secret: "dummy",
    });
  }

  razorpayInstance ??= new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID as string,
    key_secret: process.env.RAZORPAY_KEY_SECRET as string,
  });
  return razorpayInstance;
}
