import { Prisma } from "@prisma/client";
import { BookingInput, ParticipantInput } from "@/lib/validators/booking.schema";
import { calculateAge } from "@/lib/utils";

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

export function getMissingProfileFields(
  user: {
    name?: string | null;
    phoneNumber?: string | null;
    gender?: string | null;
    dateOfBirth?: Date | null;
    bloodGroup?: string | null;
    emergencyContactName?: string | null;
    emergencyContactNumber?: string | null;
    emergencyRelationship?: string | null;
    age?: number | null;
  },
  participant: {
    name?: string | null;
    phoneNumber?: string | null;
    gender?: string | null;
    dateOfBirth?: string | Date | null;
    bloodGroup?: string | null;
    emergencyContactName?: string | null;
    emergencyContactNumber?: string | null;
    emergencyRelationship?: string | null;
  }
) {
  const updateData: Prisma.UserUpdateInput = {};

  const isStringEmpty = (val: string | null | undefined) => !val || val.trim() === "";

  const isPhoneEmpty = (phone: string | null | undefined) => {
    if (!phone) return true;
    const trimmed = phone.trim();
    return trimmed === "" || /^0+$/.test(trimmed);
  };

  const stringFields = [
    "name",
    "gender",
    "bloodGroup",
    "emergencyContactName",
    "emergencyContactNumber",
    "emergencyRelationship",
  ];

  for (const field of stringFields) {
    const userVal = (user as Record<string, unknown>)[field] as string | null | undefined;
    const partVal = (participant as Record<string, unknown>)[field] as string | null | undefined;
    if (isStringEmpty(userVal) && !isStringEmpty(partVal)) {
      (updateData as Record<string, unknown>)[field] = partVal.trim();
    }
  }

  if (isPhoneEmpty(user.phoneNumber) && !isPhoneEmpty(participant.phoneNumber)) {
    updateData.phoneNumber = participant.phoneNumber!.trim();
  }

  if (!user.dateOfBirth && participant.dateOfBirth) {
    const dob = new Date(participant.dateOfBirth);
    updateData.dateOfBirth = dob;
    updateData.age = calculateAge(dob);
  }

  return updateData;
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
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        phoneNumber: true,
        gender: true,
        dateOfBirth: true,
        bloodGroup: true,
        emergencyContactName: true,
        emergencyContactNumber: true,
        emergencyRelationship: true,
        age: true,
      }
    });

    const primaryParticipant = data.participants.find(p => p.isPrimary) || data.participants[0];

    if (user && primaryParticipant) {
      const updateData = getMissingProfileFields(user, primaryParticipant);

      if (Object.keys(updateData).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: updateData,
        });
      }
    }

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
            age: p.dateOfBirth ? calculateAge(p.dateOfBirth) : null,
            dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : null,
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
