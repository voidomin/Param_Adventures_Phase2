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
 * POST /api/bookings — Create a booking and a Razorpay order in one step.
 *
 * Body: { experienceId, slotId, participantCount }
 *
 * Flow:
 * 1. Auth check
 * 2. Validate slot capacity
 * 3. Calculate total price  (basePrice × participantCount)
 * 4. Create Booking (REQUESTED) + Payment (PENDING) in a transaction
 * 5. Decrement slot.remainingCapacity
 * 6. Create Razorpay order and return order_id to the client
 */
export async function POST(request: NextRequest) {
  // Any authenticated user can create a booking
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  const userId = auth.userId;

  try {
    const body = await request.json();
    const { experienceId, slotId, participantCount, participants } = body;

    if (!experienceId || !slotId || !participantCount || participantCount < 1) {
      return NextResponse.json(
        {
          error:
            "experienceId, slotId, and participantCount (≥1) are required.",
        },
        { status: 400 },
      );
    }

    if (
      !participants ||
      !Array.isArray(participants) ||
      participants.length !== participantCount
    ) {
      return NextResponse.json(
        { error: "Participant details must match the participant count." },
        { status: 400 },
      );
    }

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

    // Create booking and decrement capacity atomically
    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          userId,
          experienceId,
          slotId,
          participantCount,
          totalPrice,
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
            })),
          },
        },
      });

      await tx.slot.update({
        where: { id: slotId },
        data: { remainingCapacity: { decrement: participantCount } },
      });

      return newBooking;
    });

    // Create Razorpay order
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
  } catch (error) {
    console.error("Booking creation error:", error);
    return NextResponse.json(
      { error: "Failed to create booking." },
      { status: 500 },
    );
  }
}
