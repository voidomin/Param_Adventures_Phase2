import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getRazorpay } from "@/lib/razorpay";
import { logActivity } from "@/lib/audit-logger";
import { revalidatePath } from "next/cache";
import { BookingRepo, BookingPricing } from "@/repositories/booking.repo";
import { BookingInput } from "@/lib/validators/booking.schema";

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
    const result = await prisma.$transaction(async (tx) => {
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

      // Create Booking record
      const booking = await BookingRepo.createBooking(tx, userId, data, pricing);

      // Decrement capacity
      // The real guard is the atomic check at the DB level (count === 0)
      const slotUpdate = await BookingRepo.updateSlotCapacity(tx, data.slotId, data.participantCount);
      if (slotUpdate.count === 0) {
        throw new Error("OVERBOOKED");
      }

      // EXTERNAL READINESS: Create the pending Payment record ATOMICALLY with the booking
      // This ensures if the booking exists, a trace of the intended payment always exists.
      // We don't have the orderId yet, but we'll update it once Razorpay responds.
      const payment = await BookingRepo.createPayment(tx, {
        bookingId: booking.id,
        orderId: "PENDING_AUTH",
        totalPrice: pricing.totalPrice,
      });

      return { booking, payment };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    const { booking } = result;

    // 3. External Integration: Razorpay
    try {
      const razorpay = await getRazorpay();
      const amountPaise = Math.round(pricing.totalPrice * 100);

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
      // Update the payment with the real provider order ID
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
      // 5. Graceful Soft-Rollback: Preserve the record but mark as CANCELLED
      // This maintains the audit trail as requested by senior engineering review.
      await prisma.$transaction(async (rollbackTx) => {
        await BookingRepo.updateStatus(rollbackTx, booking.id, "CANCELLED");
        await BookingRepo.incrementSlotCapacity(rollbackTx, data.slotId, data.participantCount);
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
      const [updatedBooking] = await prisma.$transaction([
        prisma.booking.update({
          where: { id: bookingId, paymentStatus: { not: "PAID" } },
          data: { bookingStatus: "CONFIRMED", paymentStatus: "PAID" },
        }),
        prisma.payment.updateMany({
          where: { providerOrderId: razorpayOrderId, status: { not: "PAID" } },
          data: {
            status: "PAID",
            providerPaymentId: razorpayPaymentId,
            fullPayload: payload as Prisma.InputJsonValue,
          },
        }),
      ]);

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
      select: { basePrice: true }
    });

    if (!experience) throw new Error("EXPERIENCE_NOT_FOUND");

    const totalPrice = Number(experience.basePrice) * data.participantCount;
    let baseFare = totalPrice;
    let taxBreakdown: { name: string; percentage: number; amount: number }[] = [];

    const taxSettings = await BookingRepo.getTaxConfig(prisma);
    if (taxSettings?.value) {
      try {
        const config = JSON.parse(taxSettings.value);
        if (Array.isArray(config)) {
          taxBreakdown = config.map((tax: { name: string; percentage: number }) => {
            const amount = (totalPrice * (Number(tax.percentage) || 0)) / 100;
            baseFare -= amount;
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
