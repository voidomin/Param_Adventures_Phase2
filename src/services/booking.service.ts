import { prisma, runWithRetry } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getRazorpay } from "@/lib/razorpay";
import { logActivity } from "@/lib/audit-logger";
import { revalidatePath } from "next/cache";
import { BookingRepo, BookingPricing } from "@/repositories/booking.repo";
import { BookingInput } from "@/lib/validators/booking.schema";
import { isExpiredIST, redeemCoupon } from "@/lib/coupon-engine";
import { assignInvoiceNumberIfNeeded } from "@/lib/invoice-numbering";
import { calculateRefundBreakdown } from "@/lib/refund-engine";

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

function calculateParticipantsBaseFare(
  participants: BookingInput["participants"],
  experienceBasePrice: number,
  extraAmenitiesConfig: ExtraAmenityGroup[]
): number {
  let baseFare = 0;
  for (const p of participants) {
    let participantFare = experienceBasePrice;
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
    baseFare += Math.max(0, participantFare);
  }
  return baseFare;
}

interface CouponInput {
  customerId: string;
  status: string;
  expiryDate: string | Date | null;
  balance: unknown;
}

function checkCouponValidity(coupon: CouponInput | null, userId: string) {
  if (!coupon) throw new Error("COUPON_ERROR: Invalid coupon code.");
  if (coupon.customerId !== userId) throw new Error("COUPON_ERROR: Coupon belongs to another customer.");
  if (coupon.status === "EXPIRED" || isExpiredIST(coupon.expiryDate ?? "")) {
    throw new Error("COUPON_ERROR: Coupon has expired.");
  }
  if (coupon.status === "FULLY_USED" || Number(coupon.balance) <= 0) {
    throw new Error("COUPON_ERROR: Coupon has no balance left.");
  }
  if (coupon.status === "BLOCKED" || coupon.status === "CANCELLED") {
    throw new Error(`COUPON_ERROR: Coupon is ${coupon.status.toLowerCase()}.`);
  }
}

async function processCheckoutCoupons(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  appliedCoupons: string[],
  userId: string,
  initialRemaining: number
) {
  let remaining = initialRemaining;
  let totalCouponRedeemed = 0;
  const redemptionsList: { couponId: string; amount: number }[] = [];

  for (const code of appliedCoupons) {
    if (remaining <= 0) break;

    const dbCoupon = await tx.travelCoupon.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    checkCouponValidity(dbCoupon, userId);

    if (remaining < Number(dbCoupon!.balance)) {
      throw new Error(`COUPON_ERROR: Coupon value exceeds the booking/payment amount.`);
    }

    const redeemAmount = Math.min(Number(dbCoupon!.balance), remaining);
    const nextRemaining = Math.round((remaining - redeemAmount) * 100) / 100;
    if (nextRemaining > 0 && nextRemaining < 1) {
      throw new Error(`COUPON_ERROR: Applying this coupon would leave a balance of ₹${nextRemaining}, which is below the minimum online payment of ₹1.00.`);
    }
    remaining = nextRemaining;
    totalCouponRedeemed += redeemAmount;
    redemptionsList.push({ couponId: dbCoupon!.id, amount: redeemAmount });
  }

  return { remaining, totalCouponRedeemed, redemptionsList };
}

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
      prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
        // Idempotent replay: a repeat POST carrying the same client-generated
        // key (double-click across tabs, a network-level retry) returns the
        // booking that call already produced instead of creating a duplicate.
        if (data.idempotencyKey) {
          const replay = await BookingRepo.findByIdempotencyKey(tx, userId, data.idempotencyKey);
          if (replay) {
            return {
              booking: replay.booking,
              payment: replay.payment,
              fullyPaid: replay.booking.bookingStatus === "CONFIRMED",
              totalCouponRedeemed: Number(replay.booking.paidAmount),
              idempotentReplay: true,
            };
          }
        }

        // If a similar requested/pending booking exists, mark it as cancelled so it doesn't block the new checkout.
        // That earlier attempt reserved capacity when IT was created (see below), so cancelling it here must
        // give that reservation back before this new attempt's own capacity check runs.
        const existing = await BookingRepo.findExistingPendingBooking(tx, userId, data.slotId);
        if (existing) {
          await tx.booking.update({
            where: { id: existing.id },
            data: {
              bookingStatus: "CANCELLED",
              cancellationReason: "Superseded by new checkout attempt",
            },
          });
          if (existing.slotId) {
            await BookingRepo.incrementSlotCapacity(tx, existing.slotId, existing.participantCount);
          }
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

      if (isAdvance && data.appliedCoupons && data.appliedCoupons.length > 0) {
        throw new Error("COUPON_ERROR: Coupons cannot be used for advance payments.");
      }

      // Validate and subtract applied travel coupons inside serializable transaction
      const {
        remaining: remainingPaymentAmount,
        totalCouponRedeemed,
        redemptionsList,
      } = await processCheckoutCoupons(tx, data.appliedCoupons || [], userId, paymentAmount);

      // Reserve the seats NOW, atomically, rather than only checking and
      // decrementing later at payment confirmation. The plain check above
      // is not enough on its own: several concurrent checkouts can all pass
      // it before any of them writes to the slot, oversubscribing capacity.
      // This guarded updateMany is the actual atomic gate -- it only
      // succeeds if remainingCapacity is still sufficient at write time
      // (Serializable isolation forces a losing concurrent transaction to
      // retry against fresh data rather than both succeeding). Placed after
      // all the validation-only checks above so an invalid request fails
      // fast without first taking a (harmless but pointless) capacity write
      // that a thrown error would just roll back anyway.
      const capacityReserved = await BookingRepo.updateSlotCapacity(tx, slot.id, data.participantCount);
      if (capacityReserved.count === 0) {
        throw new Error("INSUFFICIENT_CAPACITY");
      }

      // Create Booking record
      const booking = await BookingRepo.createBooking(tx, userId, data, pricing);

      // Perform coupon redemptions updates
      for (const red of redemptionsList) {
        await redeemCoupon({ couponId: red.couponId, bookingId: booking.id, amount: red.amount, tx });
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

        await assignInvoiceNumberIfNeeded(tx, booking.id);

        // Capacity was already reserved above, right after the check --
        // nothing left to decrement here.

        const payment = await BookingRepo.createPayment(tx, {
          bookingId: booking.id,
          orderId: "COUPON_REDEMPTION",
          totalPrice: totalCouponRedeemed,
        });

        await tx.payment.updateMany({
          where: { bookingId: booking.id, status: "PENDING" },
          data: { status: "PAID", provider: "MANUAL", providerPaymentId: "COUPON_PAID" },
        });

        return { booking, payment, fullyPaid: true, totalCouponRedeemed, idempotentReplay: false };
      }

      // Regular Flow with remaining Razorpay charge (Case 2)
      const payment = await BookingRepo.createPayment(tx, {
        bookingId: booking.id,
        orderId: "PENDING_AUTH",
        totalPrice: remainingPaymentAmount,
      });

        return { booking, payment, fullyPaid: false, totalCouponRedeemed, idempotentReplay: false };
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      })
    );

    const { booking, idempotentReplay } = result;

    if (result.fullyPaid) {
      if (!idempotentReplay) {
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
      }

      return {
        bookingId: booking.id,
        fullyPaidByCoupon: true,
      };
    }

    if (idempotentReplay) {
      // Reuse the Razorpay order the original call already created -- no new
      // order, no duplicate audit log entry, no second confirmation email.
      const keyIdSetting = await BookingRepo.getRazorpayKeyId(prisma);
      const keyId = keyIdSetting?.value || process.env.RAZORPAY_KEY_ID;

      return {
        bookingId: booking.id,
        orderId: result.payment?.providerOrderId,
        amount: Math.round(Number(result.payment?.amount) * 100),
        currency: result.payment?.currency || "INR",
        keyId,
      };
    }

    // 3. External Integration: Razorpay
    try {
      const razorpay = await getRazorpay();
      // Non-null: this branch only runs when idempotentReplay is false, where
      // `payment` is always the row BookingRepo.createPayment just created.
      const amountPaise = Math.round(Number(result.payment!.amount) * 100);

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
      await runWithRetry(() =>
        prisma.$transaction(async (rollbackTx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
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
        })
      );

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
      const updatedBooking = await runWithRetry(() => prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
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

        await assignInvoiceNumberIfNeeded(tx, bookingId);

        await tx.payment.updateMany({
          where: { providerOrderId: razorpayOrderId, status: { not: "PAID" } },
          data: {
            status: "PAID",
            providerPaymentId: razorpayPaymentId,
            fullPayload: payload as Prisma.InputJsonValue,
          },
        });

        if (booking.slotId && booking.bookingStatus !== "CONFIRMED") {
          // Capacity for THIS booking was already reserved when it was
          // created (see processBooking) -- nothing to decrement here.

          // Cancel any other older pending/requested bookings for this user
          // on the same slot, restoring the capacity those attempts
          // reserved at their own creation time.
          const siblingPending = await tx.booking.findMany({
            where: {
              userId: booking.userId,
              slotId: booking.slotId,
              id: { not: bookingId },
              bookingStatus: "REQUESTED",
              paymentStatus: "PENDING",
            },
            select: { id: true, participantCount: true },
          });

          if (siblingPending.length > 0) {
            await tx.booking.updateMany({
              where: { id: { in: siblingPending.map((b) => b.id) } },
              data: {
                bookingStatus: "CANCELLED",
                paymentStatus: "FAILED",
              },
            });
            const totalToRestore = siblingPending.reduce((sum, b) => sum + b.participantCount, 0);
            await BookingRepo.incrementSlotCapacity(tx, booking.slotId, totalToRestore);
          }
        }

        return updated;
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }));

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
      paymentType: booking.paymentType,
      paidAmount: Number(booking.paidAmount),
      remainingBalance: Number(booking.remainingBalance),
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

    let extraAmenitiesConfig: ExtraAmenityGroup[] = [];
    if (experience.extraAmenities) {
      if (typeof experience.extraAmenities === "string") {
        extraAmenitiesConfig = JSON.parse(experience.extraAmenities);
      } else {
        extraAmenitiesConfig = experience.extraAmenities as unknown as ExtraAmenityGroup[];
      }
    }

    const baseFare = calculateParticipantsBaseFare(
      data.participants,
      Number(experience.basePrice),
      extraAmenitiesConfig
    );

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
  },

  /**
   * Auto-expires abandoned REQUESTED bookings older than 24 hours (1440
   * minutes), restoring the slot capacity each one reserved when it was
   * created (see processBooking). This is the single source of truth for
   * this rule -- both the admin-dashboard-triggered path and the scheduled
   * cron (POST /api/admin/bookings/cleanup) call this same function, so
   * there's only one place that can drift from "cancel + restore capacity"
   * for the exact same underlying business rule.
   */
  async autoExpireAbandonedBookings(): Promise<number> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const abandonedBookings = await prisma.booking.findMany({
      where: {
        bookingStatus: "REQUESTED",
        paymentStatus: "PENDING",
        createdAt: { lt: twentyFourHoursAgo },
      },
      select: { id: true, slotId: true, participantCount: true },
    });

    if (abandonedBookings.length === 0) return 0;

    await runWithRetry(() =>
      prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
        for (const booking of abandonedBookings) {
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              bookingStatus: "CANCELLED",
              paymentStatus: "FAILED",
              cancellationReason: "Expired - Unpaid booking request exceeded 24 hours",
            },
          });
          if (booking.slotId) {
            await BookingRepo.incrementSlotCapacity(tx, booking.slotId, booking.participantCount);
          }
        }
      }),
    );

    return abandonedBookings.length;
  },

  /**
   * Auto-cancels CONFIRMED advance-payment bookings that still have an
   * unpaid remaining balance within 7 days of departure, restoring the
   * slot capacity they reserved and creating a RefundRequest for the full
   * advance amount paid (no cancellation charge -- this is a system
   * cancellation, not a choice the customer made, so the usual departure-
   * proximity cancellation-fee tiers don't apply). The RefundRequest is
   * only ever REQUESTED here -- disbursement always requires an
   * admin/super-admin to approve it, exactly like every other refund path
   * in this codebase; this function never moves money on its own.
   */
  async autoCancelUnpaidAdvanceBookings(): Promise<number> {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const candidates = await prisma.booking.findMany({
      where: {
        paymentType: "ADVANCE",
        paymentStatus: "PARTIALLY_PAID",
        bookingStatus: "CONFIRMED",
        slot: {
          date: { lte: sevenDaysFromNow },
          status: { in: ["UPCOMING", "ACTIVE"] },
        },
      },
      select: {
        id: true,
        slotId: true,
        participantCount: true,
        userId: true,
        paidAmount: true,
        totalPrice: true,
        baseFare: true,
        taxBreakdown: true,
      },
    });

    if (candidates.length === 0) return 0;

    for (const booking of candidates) {
      const paidAmount = Number(booking.paidAmount);
      const breakdown = calculateRefundBreakdown({
        baseFare: Number(booking.baseFare),
        totalPrice: Number(booking.totalPrice),
        paidAmount,
        paymentType: "ADVANCE",
        refundPercent: 100,
        taxBreakdown: booking.taxBreakdown,
        isCompanyCancellation: true,
      });

      await runWithRetry(() =>
        prisma.$transaction(async (tx) => {
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              bookingStatus: "CANCELLED",
              paymentStatus: paidAmount > 0 ? "REFUND_PENDING" : "FAILED",
              cancelledAt: new Date(),
              cancellationReason:
                "Auto-cancelled: remaining balance was not paid within 7 days of departure.",
              refundPreference: paidAmount > 0 ? "BANK_REFUND" : null,
              refundAmount: paidAmount > 0 ? breakdown.finalRefundAmount : null,
            },
          });

          if (booking.slotId) {
            await BookingRepo.incrementSlotCapacity(tx, booking.slotId, booking.participantCount);
          }

          if (paidAmount > 0) {
            await tx.refundRequest.create({
              data: {
                bookingId: booking.id,
                customerId: booking.userId,
                refundMethod: "BANK_TRANSFER",
                baseFare: breakdown.baseFare,
                gst: breakdown.gst,
                convenienceFee: breakdown.convenienceFee,
                cancellationPercent: breakdown.cancellationPercent,
                cancellationCharges: breakdown.cancellationCharges,
                finalRefundAmount: breakdown.finalRefundAmount,
                status: "REQUESTED",
                remarks:
                  "System auto-cancellation: advance paid, remaining balance unpaid 7 days before departure. Refund method defaulted to bank transfer -- confirm the customer's preference before processing.",
              },
            });
          }
        }),
      );
    }

    return candidates.length;
  },
};
