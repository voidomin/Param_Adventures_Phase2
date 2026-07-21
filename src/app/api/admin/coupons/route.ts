import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { generateCouponCode } from "@/lib/coupon-engine";
import { CouponStatus, CouponType } from "@prisma/client";
import { z } from "zod";

const createCouponSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  originalValue: z.number().positive("Value must be greater than 0"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  reason: z.string().optional().or(z.literal("")),
});

/**
 * GET /api/admin/coupons
 * List all coupons (admin only)
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "booking:view-all");
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const whereClause: Record<string, unknown> = {};
    if (status && status !== "ALL") {
      whereClause.status = status as CouponStatus;
    }

    const coupons = await prisma.travelCoupon.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        issuedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ coupons });

  } catch (error) {
    console.error("Admin coupons list error:", error);
    return NextResponse.json({ error: "Failed to list coupons." }, { status: 500 });
  }
}

/**
 * POST /api/admin/coupons
 * Create a Goodwill coupon for a customer (admin only)
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, ["booking:cancel", "booking:moderate"]);
  if (!auth.authorized) return auth.response;

  const adminId = auth.userId;

  try {
    const body = await request.json();
    const parsed = createCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { customerId, originalValue, expiryDate, reason } = parsed.data;

    // Check if customer exists
    const customer = await prisma.user.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    const couponCode = generateCouponCode("PARAM");

    const coupon = await prisma.$transaction(async (tx) => {
      const tc = await tx.travelCoupon.create({
        data: {
          code: couponCode,
          customerId,
          originalValue,
          balance: originalValue,
          expiryDate: new Date(expiryDate),
          status: CouponStatus.ACTIVE,
          type: CouponType.GOODWILL,
          reason: reason || "Issued as goodwill by administrator",
          issuedById: adminId,
        },
      });

      await tx.couponTransaction.create({
        data: {
          couponId: tc.id,
          type: "ISSUED",
          amount: originalValue,
          previousBalance: 0,
          newBalance: originalValue,
          remarks: reason || "Admin goodwill coupon issue",
        },
      });

      return tc;
    });

    return NextResponse.json({ success: true, coupon });

  } catch (error) {
    console.error("Admin create coupon error:", error);
    return NextResponse.json({ error: "Failed to create coupon." }, { status: 500 });
  }
}
