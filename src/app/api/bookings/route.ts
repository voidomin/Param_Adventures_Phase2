import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

/**
 * POST /api/bookings
 * 
 * Create a new booking for a specific experience and slot.
 * Body: { experienceId, slotId, participantCount, participants }
 */
import { z } from "zod";

const participantSchema = z.object({
  isPrimary: z.boolean().optional(),
  name: z.string().min(1, "Participant name is required"),
  email: z.string().email({ message: "Invalid email format" }).optional().or(z.literal("")),
  phoneNumber: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  age: z.number().or(z.string()).optional().or(z.literal("")),
  bloodGroup: z.string().optional().or(z.literal("")),
  emergencyContactName: z.string().optional().or(z.literal("")),
  emergencyContactNumber: z.string().optional().or(z.literal("")),
  emergencyRelationship: z.string().optional().or(z.literal("")),
  pickupPoint: z.string().optional().or(z.literal("")),
  dropPoint: z.string().optional().or(z.literal("")),
});

const bookingSchema = z.object({
  experienceId: z.string().min(1, "experienceId is required"),
  slotId: z.string().min(1, "slotId is required"),
  participantCount: z.number().int().min(1),
  participants: z.array(participantSchema).min(1),
}).refine(data => data.participants.length === data.participantCount, {
  message: "Participant details must match the participant count.",
  path: ["participants"]
});

import { Prisma } from "@prisma/client";

// Helper to lower cognitive complexity
async function calculateTaxes(totalPrice: number) {
  let taxBreakdown: Prisma.InputJsonValue = [];
  let baseFare = totalPrice;

  const settings = await prisma.platformSetting.findUnique({
    where: { key: 'taxConfig' }
  });
  
  if (settings?.value) {
     try {
        const config = JSON.parse(settings.value);
        if (Array.isArray(config)) {
           taxBreakdown = config.map((tax) => {
              const amount = (totalPrice * (Number(tax.percentage) || 0)) / 100;
              baseFare -= amount;
              return { ...tax, amount };
           });
        }
     } catch {
        console.error("Failed to parse taxConfig during booking");
     }
  }

  return { taxBreakdown, baseFare };
}

export async function POST(request: NextRequest) {
  // Any authenticated user can create a booking
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  const userId = auth.userId;

  try {
    const body = await request.json();
    // ─── Validation ──────────────────────────────────────
    const parseResult = bookingSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { experienceId, slotId, participantCount, participants } = parseResult.data;

    // Fetch experience and slot together
    const [experience, slot] = await Promise.all([
      prisma.experience.findUnique({ where: { id: experienceId } }),
      prisma.slot.findUnique({ where: { id: slotId } }),
    ]);

    if (experience?.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "Experience not found." },
        { status: 404 },
      );
    }
    if (!slot || slot.experienceId !== experienceId) {
      return NextResponse.json(
        { error: "Slot not found for this experience." },
        { status: 404 },
      );
    }
    if (slot.remainingCapacity < participantCount) {
      return NextResponse.json(
        { error: `Only ${slot.remainingCapacity} seat(s) remaining.` },
        { status: 409 },
      );
    }

    const totalPrice = Number(experience.basePrice) * participantCount;
    const amountPaise = Math.round(totalPrice * 100); // Razorpay uses paise

    const { taxBreakdown, baseFare } = await calculateTaxes(totalPrice);

    // Create booking and decrement capacity atomically
    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          userId,
          experienceId,
          slotId,
          participantCount,
          totalPrice,
          baseFare,
          taxBreakdown,
          bookingStatus: "REQUESTED",
          paymentStatus: "PENDING",
          participants: {
            create: participants.map((p) => ({
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

      const slotUpdate = await tx.slot.updateMany({
        where: { id: slotId, remainingCapacity: { gte: participantCount } },
        data: { remainingCapacity: { decrement: participantCount } },
      });

      if (slotUpdate.count === 0) {
        throw new Error("OVERBOOKED");
      }

      return newBooking;
    });

    // Create Razorpay order
    try {
      const order = await razorpay.orders.create({
        amount: amountPaise,
        currency: "INR",
        receipt: booking.id,
        notes: {
          bookingId: booking.id,
          experienceId,
          userId,
        },
      });

      // Store the Razorpay order ID in a pending payment record
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          provider: "RAZORPAY",
          providerOrderId: order.id,
          amount: totalPrice,
          currency: "INR",
          status: "PENDING",
        },
      });

      await logActivity("BOOKING_REQUESTED", userId, "Booking", booking.id, {
        experienceId,
        slotId,
        participantCount,
      });

      return NextResponse.json({
        bookingId: booking.id,
        orderId: order.id,
        amount: amountPaise,
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    } catch (razorpayError) {
      // Revert the booking and capacity atomically if Razorpay fails
      await prisma.$transaction(async (rollbackTx) => {
        await rollbackTx.booking.delete({ where: { id: booking.id } });
        await rollbackTx.slot.update({
          where: { id: slotId },
          data: { remainingCapacity: { increment: participantCount } },
        });
      });

      console.error("Razorpay order creation failed, booking rolled back:", razorpayError);
      return NextResponse.json(
        { error: "Payment gateway unavailable. Please try again." },
        { status: 502 },
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message === "OVERBOOKED") {
      return NextResponse.json(
        { error: "Sorry, those seats were just booked by someone else. Not enough capacity." },
        { status: 409 },
      );
    }
    console.error("Booking creation error detail:", error);
    return NextResponse.json(
      { error: "Failed to create booking." },
      { status: 500 },
    );
  }
}
