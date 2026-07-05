import { prisma, runWithRetry } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getRazorpay } from "@/lib/razorpay";
import { logActivity } from "@/lib/audit-logger";
import { revalidatePath } from "next/cache";
import { BookingRepo, BookingPricing } from "@/repositories/booking.repo";
import { BookingInput } from "@/lib/validators/booking.schema";
import { isExpiredIST } from "@/lib/coupon-engine";

export const BookingService = {
  /**
   * Orchestrates the entire booking creation flow with production-grade safety.
   * Handles capacity checks, database transactions, Razorpay order creation,
   * and automatic rollback if external payment systems fail.
   */
  async processBooking(userId: string, data: BookingInput) {
    // 1. Calculate pricing and taxes (Business Rule)
    const pricing = await this.calculatePricing(data);

    // 2. ATOMIC TRANSACTION: Ensuring Slot Capacity vs Booking Entry
    // We use Serializable isolation to prevent phantom reads and ensure absolute consistency.
    const result = await runWithRetry(() =>
      prisma.$transaction(async (tx) => {
        // Idempotency: Check if a similar requested booking exists for this user/slot
      const existing = await BookingRepo.findExistingPendingBooking(tx, userId, data.slotId);
      if (existing) {
        throw new Error("ALREADY_REQUESTED");
      }

      // Experience & Slot checks
      const [experience, slot] = await Promise.all([
        BookingRepo.findExperienceById(tx, data.experienceId),
        BookingRepo.findSlotById(tx, data.slotId),
      ]);

      if (experience?.status !== "PUBLISHED") {
        throw new Error("EXPERIENCE_NOT_AVAILABLE");
      }

      if (slot?.experienceId !== data.experienceId) {
        throw new Error("SLOT_MISMATCH");
      }

      const now = new Date();
      if (new Date(slot.date) < now) {
        throw new Error("SLOT_EXPIRED");
      }

      if (slot.remainingCapacity < data.participantCount) {
        throw new Error("INSUFFICIENT_CAPACITY");
      }

      const isAdvance = data.paymentType === "ADVANCE" && experience.allowAdvancePayment && experience.advancePaymentAmount;
      const paymentAmount = isAdvance
        ? Number(experience.advancePaymentAmount) * data.participantCount
        : pricing.totalPrice;

      // Validate and subtract applied travel coupons inside serializable transaction
      let remainingPaymentAmount = paymentAmount;
      let totalCouponRedeemed = 0;
      const redemptionsList: { couponId: string; amount: number }[] = [];

      if (data.appliedCoupons && data.appliedCoupons.length > 0) {
        for (const code of data.appliedCoupons) {
          if (remainingPaymentAmount <= 0) break;

          const dbCoupon = await tx.travelCoupon.findUnique({
            where: { code: code.toUpperCase().trim() },
          });

          if (!dbCoupon) throw new Error(`COUPON_ERROR: Invalid coupon code: ${code}`);
          if (dbCoupon.customerId !== userId) throw new Error(`COUPON_ERROR: Coupon belongs to another customer.`);
          if (dbCoupon.status === "EXPIRED" || isExpiredIST(dbCoupon.expiryDate)) {
            throw new Error(`COUPON_ERROR: Coupon has expired.`);
          }
          if (dbCoupon.status === "FULLY_USED" || Number(dbCoupon.balance) <= 0) {
            throw new Error(`COUPON_ERROR: Coupon has no balance left.`);
          }
          if (dbCoupon.status === "BLOCKED" || dbCoupon.status === "CANCELLED") {
            throw new Error(`COUPON_ERROR: Coupon is blocked or cancelled.`);
          }

          const redeemAmount = Math.min(Number(dbCoupon.balance), remainingPaymentAmount);
          remainingPaymentAmount = Math.round((remainingPaymentAmount - redeemAmount) * 100) / 100;
          totalCouponRedeemed += redeemAmount;
          redemptionsList.push({ couponId: dbCoupon.id, amount: redeemAmount });
        }
      }

      // Create Booking record
      const booking = await BookingRepo.createBooking(tx, userId, data, pricing);

      // Perform coupon redemptions updates
      for (const red of redemptionsList) {
        const c = await tx.travelCoupon.findUnique({ where: { id: red.couponId } });
        if (!c) throw new Error("Coupon not found.");
        const curBal = Number(c.balance);
        const newBal = Math.max(0, curBal - red.amount);
        const newStatus = newBal === 0 ? "FULLY_USED" : "PARTIALLY_USED";

        await tx.travelCoupon.update({
          where: { id: red.couponId },
          data: { balance: newBal, status: newStatus },
        });

        await tx.couponTransaction.create({
          data: {
            couponId: red.couponId,
            bookingId: booking.id,
            type: "REDEEMED",
            amount: red.amount,
            previousBalance: curBal,
            newBalance: newBal,
            remarks: `Redeemed on booking ${booking.id.substring(0, 8)}...`,
          },
        });
      }

      // Update booking paid amount with coupons applied
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          paidAmount: totalCouponRedeemed,
          remainingBalance: Math.max(0, Number(booking.totalPrice) - totalCouponRedeemed),
        },
      });

      // If fully covered by coupon(s), confirm instantly! (Case 1)
      if (remainingPaymentAmount <= 0.01) {
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            bookingStatus: "CONFIRMED",
            paymentStatus: "PAID",
          },
        });

        await tx.slot.update({
          where: { id: slot.id },
          data: { remainingCapacity: { decrement: booking.participantCount } },
        });

        const payment = await BookingRepo.createPayment(tx, {
          bookingId: booking.id,
          orderId: "COUPON_REDEMPTION",
          totalPrice: totalCouponRedeemed,
        });

        await tx.payment.updateMany({
          where: { bookingId: booking.id, status: "PENDING" },
          data: { status: "PAID", provider: "MANUAL", providerPaymentId: "COUPON_PAID" },
        });

        return { booking, payment, fullyPaid: true, totalCouponRedeemed };
      }

      // Regular Flow with remaining Razorpay charge (Case 2)
      const payment = await BookingRepo.createPayment(tx, {
        bookingId: booking.id,
        orderId: "PENDING_AUTH",
        totalPrice: remainingPaymentAmount,
      });

        return { booking, payment, fullyPaid: false, totalCouponRedeemed };
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      })
    );

    const { booking } = result;

    if (result.fullyPaid) {
      await logActivity("BOOKING_REQUESTED", userId, "Booking", booking.id, {
        experienceId: data.experienceId,
        slotId: data.slotId,
        participantCount: data.participantCount,
        paymentType: "COUPON",
      });

      await logActivity("BOOKING_CONFIRMED", userId, "Booking", booking.id, {
        paymentType: "COUPON",
        totalCouponRedeemed: result.totalCouponRedeemed,
      });

      revalidatePath("/", "layout");

      // Send confirmation email
      this.sendBookingConfirmationWithDetails(booking.id).catch((err) =>
        console.error("[BookingService] Background email error:", err),
      );

      return {
        bookingId: booking.id,
        fullyPaidByCoupon: true,
      };
    }

    // 3. External Integration: Razorpay
    try {
      const razorpay = await getRazorpay();
      const amountPaise = Math.round(Number(result.payment.amount) * 100);

      const keyIdSetting = await BookingRepo.getRazorpayKeyId(prisma);
      const keyId = keyIdSetting?.value || process.env.RAZORPAY_KEY_ID;

      const order = await razorpay.orders.create({
        amount: amountPaise,
        currency: "INR",
        receipt: booking.id,
        notes: {
          bookingId: booking.id,
          experienceId: data.experienceId,
          userId,
        },
      });

      // 4. Finalize Payment & Audit Trail
      await prisma.payment.updateMany({
        where: { bookingId: booking.id, status: "PENDING" },
        data: { providerOrderId: order.id }
      });

      await logActivity("BOOKING_REQUESTED", userId, "Booking", booking.id, {
        experienceId: data.experienceId,
        slotId: data.slotId,
        participantCount: data.participantCount,
        orderId: order.id
      });

      revalidatePath("/", "layout");

      return {
        bookingId: booking.id,
        orderId: order.id,
        amount: amountPaise,
        currency: "INR",
        keyId,
      };

    } catch (razorpayError) {
      // 5. Graceful Soft-Rollback: Restore coupons and set booking CANCELLED
      await prisma.$transaction(async (rollbackTx) => {
        await BookingRepo.updateStatus(rollbackTx, booking.id, "CANCELLED");
        
        // Restore applied coupons on Razorpay error
        const redemptions = await rollbackTx.couponTransaction.findMany({
          where: { bookingId: booking.id, type: "REDEEMED" },
        });

        for (const r of redemptions) {
          const coupon = await rollbackTx.travelCoupon.findUnique({ where: { id: r.couponId } });
          if (!coupon) continue;
          const currentBal = Number(coupon.balance);
          const newBal = currentBal + Number(r.amount);
          
          await rollbackTx.travelCoupon.update({
            where: { id: coupon.id },
            data: { balance: newBal, status: "ACTIVE" },
          });

          await rollbackTx.couponTransaction.create({
            data: {
              couponId: coupon.id,
              bookingId: booking.id,
              type: "RESTORED",
              amount: r.amount,
              previousBalance: currentBal,
              newBalance: newBal,
              remarks: "Restored due to Razorpay order initialization failure",
            },
          });
        }
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });

      revalidatePath("/", "layout");
      console.error("[BookingService] Razorpay failure, booking rolled back to CANCELLED state:", razorpayError);
      throw new Error("PAYMENT_GATEWAY_ERROR");
    }
  },

  /**
   * Finalizes a payment. Atomic update for both Booking and Payment records.
   * Shared by both the frontend-verify API and the Webhook handler.
   */
  async confirmPayment(bookingId: string, razorpayOrderId: string, razorpayPaymentId: string, payload: Record<string, unknown>) {
    try {
      const updatedBooking = await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          select: { id: true, userId: true, bookingStatus: true, participantCount: true, slotId: true, totalPrice: true, paidAmount: true },
        });

        if (!booking) {
          throw new Error("BOOKING_NOT_FOUND");
        }

        const paymentRecord = await tx.payment.findFirst({
          where: { providerOrderId: razorpayOrderId },
        });

        if (!paymentRecord) {
          throw new Error("PAYMENT_NOT_FOUND");
        }

        // Case 5: Verify coupons used in this booking have not expired in the meantime
        const redemptions = await tx.couponTransaction.findMany({
          where: { bookingId, type: "REDEEMED" },
          include: { coupon: true },
        });

        for (const r of redemptions) {
          if (isExpiredIST(r.coupon.expiryDate)) {
            throw new Error("COUPON_EXPIRED_DURING_CHECKOUT");
          }
        }

        // If this specific payment is already PAID, return the booking (idempotency)
        if (paymentRecord.status === "PAID") {
          return booking;
        }

        const paymentAmount = Number(paymentRecord.amount);
        const newPaidAmount = Number(booking.paidAmount) + paymentAmount;
        const remainingBalance = Number(booking.totalPrice) - newPaidAmount;
        const newPaymentStatus = remainingBalance > 0.01 ? "PARTIALLY_PAID" : "PAID";

        const updated = await tx.booking.update({
          where: { id: bookingId },
          data: { 
            bookingStatus: "CONFIRMED", 
            paymentStatus: newPaymentStatus,
            paidAmount: newPaidAmount,
            remainingBalance: Math.max(0, remainingBalance),
          },
        });

        await tx.payment.updateMany({
          where: { providerOrderId: razorpayOrderId, status: { not: "PAID" } },
          data: {
            status: "PAID",
            providerPaymentId: razorpayPaymentId,
            fullPayload: payload as Prisma.InputJsonValue,
          },
        });

        if (booking.slotId && booking.bookingStatus !== "CONFIRMED") {
          // Decrement slot remainingCapacity by participantCount
          await tx.slot.update({
            where: { id: booking.slotId },
            data: { remainingCapacity: { decrement: booking.participantCount } },
          });

          // Cancel any other older pending/requested bookings for this user on the same slot
          await tx.booking.updateMany({
            where: {
              userId: booking.userId,
              slotId: booking.slotId,
              id: { not: bookingId },
              bookingStatus: "REQUESTED",
              paymentStatus: "PENDING",
            },
            data: {
              bookingStatus: "CANCELLED",
              paymentStatus: "FAILED",
            },
          });
        }

        return updated;
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });

      // Revalidate entire layout to refresh slot capacities
      revalidatePath("/", "layout");

      // Send confirmation email (fire-and-forget)
      this.sendBookingConfirmationWithDetails(bookingId).catch((err) =>
        console.error("[BookingService] Background email error:", err),
      );

      return updatedBooking;
    } catch (error: unknown) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
        // Idempotency: Already paid
        return await prisma.booking.findUnique({ where: { id: bookingId } });
      }
      throw error;
    }
  },

  /**
   * Internal helper to fetch full details and send the email.
   */
  async sendBookingConfirmationWithDetails(bookingId: string) {
    const { sendBookingConfirmation } = await import("@/lib/email");
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { name: true, email: true } },
        experience: { select: { title: true } },
        slot: { select: { date: true } },
      },
    });

    if (!booking?.slot) return;

    await sendBookingConfirmation({
      userName: booking.user.name,
      userEmail: booking.user.email,
      experienceTitle: booking.experience.title,
      slotDate: booking.slot.date.toISOString(),
      participantCount: booking.participantCount,
      totalPrice: Number(booking.totalPrice),
      baseFare: Number(booking.baseFare),
      taxBreakdown: booking.taxBreakdown as { name: string; percentage: number; amount: number }[],
      bookingId: booking.id,
    });
  },

  /**
   * Business rule: Calculate base fare and dynamic taxes based on platform settings.
   */
  async calculatePricing(data: BookingInput) {
    const experience = await prisma.experience.findUnique({
      where: { id: data.experienceId },
      select: { basePrice: true, extraAmenities: true }
    });

    if (!experience) throw new Error("EXPERIENCE_NOT_FOUND");

    interface ExtraAmenityOption {
      id: string;
      name: string;
      price: number;
    }

    interface ExtraAmenityGroup {
      id: string;
      name: string;
      type: "SINGLE" | "MULTI";
      options: ExtraAmenityOption[];
    }

    const extraAmenitiesConfig = (experience.extraAmenities
      ? (typeof experience.extraAmenities === "string"
        ? JSON.parse(experience.extraAmenities)
        : experience.extraAmenities)
      : []) as unknown as ExtraAmenityGroup[];

    let baseFare = 0;
    for (const p of data.participants) {
      let participantFare = Number(experience.basePrice);
      if (p.selectedAmenities && Array.isArray(p.selectedAmenities)) {
        for (const selected of p.selectedAmenities) {
          const group = extraAmenitiesConfig.find((g) => g.id === selected.groupId);
          const option = group?.options?.find((o) => o.id === selected.optionId);
          if (option) {
            participantFare += Number(option.price) || 0;
            selected.price = Number(option.price) || 0;
          } else {
            selected.price = 0;
          }
        }
      }
      baseFare += participantFare;
    }

    let totalPrice = baseFare;
    let taxBreakdown: { name: string; percentage: number; amount: number }[] = [];

    const taxSettings = await BookingRepo.getTaxConfig(prisma);
    if (taxSettings?.value) {
      try {
        const config = JSON.parse(taxSettings.value);
        if (Array.isArray(config)) {
          taxBreakdown = config.map((tax: { name: string; percentage: number }) => {
            const amount = (baseFare * (Number(tax.percentage) || 0)) / 100;
            totalPrice += amount;
            return { ...tax, amount };
          });
        }
      } catch {
        console.error("[BookingService] Failed to parse taxConfig");
      }
    }

    return { totalPrice, baseFare, taxBreakdown } as BookingPricing;
  }
};
