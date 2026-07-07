import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { validateCoupon } from "@/lib/coupon-engine";
import { z } from "zod";

const validateSchema = z.object({
  code: z.string().min(1, "Coupon code is required"),
  paymentAmount: z.number().optional(),
});

/**
 * POST /api/coupons/validate
 * Validates a coupon code for the logged-in customer during checkout
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const parsed = validateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { code, paymentAmount } = parsed.data;
    const { coupon, error } = await validateCoupon(code, auth.userId);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    if (paymentAmount !== undefined) {
      if (paymentAmount < Number(coupon.balance)) {
        return NextResponse.json(
          { error: `Coupon value (₹${Number(coupon.balance)}) cannot exceed the booking/payment amount (₹${paymentAmount}).` },
          { status: 400 }
        );
      }

      const remaining = Number((paymentAmount - Number(coupon.balance)).toFixed(2));
      if (remaining > 0 && remaining < 1) {
        return NextResponse.json(
          { error: `Applying this coupon would leave a balance of ₹${remaining}, which is below the minimum online payment of ₹1.00.` },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        balance: Number(coupon.balance),
        expiryDate: coupon.expiryDate,
      },
    });

  } catch (error) {
    console.error("Coupon validation error:", error);
    return NextResponse.json({ error: "Failed to validate coupon." }, { status: 500 });
  }
}
