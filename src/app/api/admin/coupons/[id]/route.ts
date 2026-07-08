import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { generateCouponCode } from "@/lib/coupon-engine";
import { CouponStatus, CouponType } from "@prisma/client";

/**
 * PATCH /api/admin/coupons/[id]
 * Adjust coupon value, extend expiry, or block/disable coupon
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request, ["booking:moderate", "booking:cancel"]);
  if (!auth.authorized) return auth.response;

  const { id: couponId } = await params;
  const adminId = auth.userId;

  try {
    const body = await request.json();
    const { balanceAction, amount, expiryDate, status, remarks } = body;

    const coupon = await prisma.travelCoupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found." }, { status: 404 });
    }

    const updatedCoupon = await prisma.$transaction(async (tx) => {
      const currentBal = Number(coupon.balance);
      let newBal = currentBal;

      if (balanceAction && amount > 0) {
        if (balanceAction === "INCREASE") {
          newBal = currentBal + Number(amount);
        } else if (balanceAction === "DECREASE") {
          newBal = Math.max(0, currentBal - Number(amount));
        }

        // Log transaction for adjustment
        await tx.couponTransaction.create({
          data: {
            couponId,
            type: "ADJUSTED",
            amount,
            previousBalance: currentBal,
            newBalance: newBal,
            remarks: remarks || `Admin balance adjustment: ${balanceAction}`,
          },
        });
      }

      const updatePayload: Record<string, unknown> = {
        balance: newBal,
      };

      if (expiryDate) {
        updatePayload.expiryDate = new Date(expiryDate);
      }
      if (status) {
        updatePayload.status = status as CouponStatus;
      }

      const tc = await tx.travelCoupon.update({
        where: { id: couponId },
        data: updatePayload,
      });

      return tc;
    });

    await logActivity("COUPON_ADJUSTED", adminId, "TravelCoupon", couponId, {
      balanceAction,
      amount,
      status,
    });

    return NextResponse.json({ success: true, coupon: updatedCoupon });

  } catch (error) {
    console.error("Admin adjust coupon error:", error);
    return NextResponse.json({ error: "Failed to adjust coupon." }, { status: 500 });
  }
}

/**
 * POST /api/admin/coupons/[id]
 * Merge or Split coupons
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request, ["booking:moderate", "booking:cancel"]);
  if (!auth.authorized) return auth.response;

  const { id: couponId } = await params;
  const adminId = auth.userId;

  try {
    const body = await request.json();
    const { action, mergeCouponIds, splitAmounts } = body;

    const coupon = await prisma.travelCoupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found." }, { status: 404 });
    }

    if (action === "MERGE") {
      if (!Array.isArray(mergeCouponIds) || mergeCouponIds.length === 0) {
        return NextResponse.json({ error: "Coupons to merge must be provided as an array." }, { status: 400 });
      }

      // Merge coupons balances together
      const result = await prisma.$transaction(async (tx) => {
        const couponsToMerge = await tx.travelCoupon.findMany({
          where: { id: { in: mergeCouponIds } },
        });

        let totalMergedBalance = Number(coupon.balance);
        for (const c of couponsToMerge) {
          if (c.customerId !== coupon.customerId) {
            throw new Error("Cannot merge coupons belonging to different customers.");
          }
          if (c.status === CouponStatus.CANCELLED || c.status === CouponStatus.BLOCKED) {
            throw new Error(`Cannot merge inactive/blocked coupon: ${c.code}`);
          }
          totalMergedBalance += Number(c.balance);

          // Disable/cancel the merged coupon
          await tx.travelCoupon.update({
            where: { id: c.id },
            data: { status: CouponStatus.CANCELLED, balance: 0 },
          });

          await tx.couponTransaction.create({
            data: {
              couponId: c.id,
              type: "ADJUSTED",
              amount: c.balance,
              previousBalance: c.balance,
              newBalance: 0,
              remarks: `Merged into coupon ${coupon.code}`,
            },
          });
        }

        // Update target coupon balance
        const updated = await tx.travelCoupon.update({
          where: { id: couponId },
          data: { balance: totalMergedBalance },
        });

        await tx.couponTransaction.create({
          data: {
            couponId,
            type: "ADJUSTED",
            amount: totalMergedBalance - Number(coupon.balance),
            previousBalance: coupon.balance,
            newBalance: totalMergedBalance,
            remarks: `Merged balance from other coupons: ${couponsToMerge.map(c => c.code).join(", ")}`,
          },
        });

        return updated;
      });

      return NextResponse.json({ success: true, coupon: result });

    } else if (action === "SPLIT") {
      if (!Array.isArray(splitAmounts) || splitAmounts.length === 0) {
        return NextResponse.json({ error: "Split amounts must be provided as an array." }, { status: 400 });
      }

      const totalSplitValue = splitAmounts.reduce((sum, val) => sum + Number(val), 0);
      if (totalSplitValue > Number(coupon.balance)) {
        return NextResponse.json({ error: "Total split value cannot exceed current coupon balance." }, { status: 400 });
      }

      const result = await prisma.$transaction(async (tx) => {
        const newCoupons = [];
        let currentBalance = Number(coupon.balance);

        for (const amt of splitAmounts) {
          const splitCode = generateCouponCode("SPLIT");
          const expiry = new Date(coupon.expiryDate);

          const nc = await tx.travelCoupon.create({
            data: {
              code: splitCode,
              customerId: coupon.customerId,
              originalValue: amt,
              balance: amt,
              expiryDate: expiry,
              status: CouponStatus.ACTIVE,
              type: CouponType.GOODWILL,
              reason: `Split from coupon ${coupon.code}`,
              issuedById: adminId,
            },
          });

          await tx.couponTransaction.create({
            data: {
              couponId: nc.id,
              type: "ISSUED",
              amount: amt,
              previousBalance: 0,
              newBalance: amt,
              remarks: `Split from coupon ${coupon.code}`,
            },
          });

          newCoupons.push(nc);
          
          // Deduct from parent coupon
          const prevBal = currentBalance;
          currentBalance -= Number(amt);

          await tx.travelCoupon.update({
            where: { id: couponId },
            data: { balance: currentBalance },
          });

          await tx.couponTransaction.create({
            data: {
              couponId,
              type: "ADJUSTED",
              amount: amt,
              previousBalance: prevBal,
              newBalance: currentBalance,
              remarks: `Deducted for split into coupon ${splitCode}`,
            },
          });
        }

        // If balance reached 0, mark fully used
        if (currentBalance === 0) {
          await tx.travelCoupon.update({
            where: { id: couponId },
            data: { status: CouponStatus.FULLY_USED },
          });
        }

        return { newCoupons };
      });

      return NextResponse.json({ success: true, splitCoupons: result.newCoupons });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });

  } catch (error: unknown) {
    console.error("Admin split/merge coupon error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to split/merge coupon." }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/coupons/[id]
 * Delete a coupon (Super Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  // Confirm user has Super Admin role
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: { role: true },
  });

  if (user?.role?.name !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only Super Admins can delete coupons." }, { status: 403 });
  }

  const { id: couponId } = await params;

  try {
    const coupon = await prisma.travelCoupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found." }, { status: 404 });
    }

    await prisma.travelCoupon.delete({
      where: { id: couponId },
    });

    await logActivity("COUPON_DELETED", auth.userId, "TravelCoupon", couponId, {
      code: coupon.code,
    });

    return NextResponse.json({ success: true, message: "Coupon deleted successfully." });

  } catch (error) {
    console.error("Admin delete coupon error:", error);
    return NextResponse.json({ error: "Failed to delete coupon." }, { status: 500 });
  }
}
