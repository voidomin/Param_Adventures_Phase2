import { Prisma } from "@prisma/client";
import { BookingInput, ParticipantInput } from "@/lib/validators/booking.schema";

export interface BookingPricing {
  totalPrice: number;
  baseFare: number;
  taxBreakdown: Prisma.InputJsonValue;
}

export interface PaymentData {
  bookingId: string;
  orderId: string;
  totalPrice: number;
}

/**
 * Repository for Booking-related Data Access.
 * Methods accept a 'tx' (Transaction Client) to support atomic operations.
 */
export const BookingRepo = {
  async findExperienceById(tx: Prisma.TransactionClient, id: string) {
    return tx.experience.findUnique({ where: { id } });
  },

  async findSlotById(tx: Prisma.TransactionClient, id: string) {
    return tx.slot.findUnique({ where: { id } });
  },

  async getTaxConfig(tx: Prisma.TransactionClient) {
    return tx.platformSetting.findUnique({
      where: { key: 'taxConfig' }
    });
  },

  async getRazorpayKeyId(tx: Prisma.TransactionClient) {
    return tx.platformSetting.findUnique({
      where: { key: "razorpay_key_id" }
    });
  },

  async createBooking(tx: Prisma.TransactionClient, userId: string, data: BookingInput, pricing: BookingPricing) {
    return tx.booking.create({
      data: {
        userId,
        experienceId: data.experienceId,
        slotId: data.slotId,
        participantCount: data.participantCount,
        totalPrice: pricing.totalPrice,
        baseFare: pricing.baseFare,
        taxBreakdown: pricing.taxBreakdown,
        bookingStatus: "REQUESTED",
        paymentStatus: "PENDING",
        participants: {
          create: data.participants.map((p: ParticipantInput) => ({
            isPrimary: p.isPrimary || false,
            name: p.name,
            email: p.email || null,
            phoneNumber: p.phoneNumber || null,
            gender: p.gender || null,
            age: p.age ? Number(p.age) : null,
            bloodGroup: p.bloodGroup || null,
            emergencyContactName: p.emergencyContactName || null,
            emergencyContactNumber: p.emergencyContactNumber || null,
            emergencyRelationship: p.emergencyRelationship || null,
            pickupPoint: p.pickupPoint || null,
            dropPoint: p.dropPoint || null,
          })),
        },
      },
    });
  },

  async updateSlotCapacity(tx: Prisma.TransactionClient, id: string, decrement: number) {
    return tx.slot.updateMany({
      where: { id, remainingCapacity: { gte: decrement } },
      data: { remainingCapacity: { decrement } },
    });
  },

  async updateStatus(tx: Prisma.TransactionClient, id: string, status: "REQUESTED" | "CONFIRMED" | "CANCELLED") {
    return tx.booking.update({
      where: { id },
      data: { bookingStatus: status },
    });
  },

  async deleteBooking(tx: Prisma.TransactionClient, id: string) {
    return tx.booking.delete({ where: { id } });
  },

  async incrementSlotCapacity(tx: Prisma.TransactionClient, id: string, increment: number) {
    return tx.slot.update({
      where: { id },
      data: { remainingCapacity: { increment } },
    });
  },

  async createPayment(tx: Prisma.TransactionClient, data: PaymentData) {
    return tx.payment.create({
      data: {
        bookingId: data.bookingId,
        provider: "RAZORPAY",
        providerOrderId: data.orderId,
        amount: data.totalPrice,
        currency: "INR",
        status: "PENDING",
      },
    });
  },

  async findExistingPendingBooking(tx: Prisma.TransactionClient, userId: string, slotId: string) {
    return tx.booking.findFirst({
      where: {
        userId,
        slotId,
        bookingStatus: "REQUESTED",
        paymentStatus: "PENDING",
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
      }
    });
  }
};
