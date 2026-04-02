import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { sendBookingConfirmation } from "@/lib/email";
import { logActivity } from "@/lib/audit-logger";
import { z } from "zod";

const manualVerifySchema = z.object({
  transactionId: z.string().min(1, "Transaction ID is required"),
  amountPaid: z.number().min(0, "Amount must be a positive number"),
  paymentProofUrl: z.url({ message: "Valid proof URL is required" }),
  adminNotes: z.string().optional(),
});

async function sendBookingConfirmationEmail(bookingId: string) {
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
}

/**
 * POST /api/admin/bookings/[id]/verify-manual
 * 
 * Verifies a booking via manual payment (Admin only).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;

  try {
    // 1. Auth Check (Admin Only)
    const auth = await authorizeRequest(request);
    if (!auth.authorized) {
      return auth.response;
    }
    
    if (auth.roleName !== "ADMIN" && auth.roleName !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const result = manualVerifySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { transactionId, amountPaid, paymentProofUrl, adminNotes } = result.data;

    // 2. Fetch Booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.paymentStatus === "PAID") {
      return NextResponse.json({ error: "Booking is already paid" }, { status: 400 });
    }

    // 3. Update Database (Atomic Transaction)
    const [updatedBooking] = await prisma.$transaction([
      prisma.booking.update({
        where: { id: bookingId },
        data: {
          bookingStatus: "CONFIRMED",
          paymentStatus: "PAID",
        },
      }),
      prisma.payment.create({
        data: {
          bookingId: bookingId,
          provider: "MANUAL",
          providerPaymentId: transactionId,
          status: "PAID",
          amount: amountPaid,
          fullPayload: {
            proofUrl: paymentProofUrl,
            adminNotes: adminNotes ?? null,
            verifiedBy: auth.userId,
            verifiedAt: new Date().toISOString(),
          },
        },
      }),
      // Decrement slot capacity if it wasn't already decremented
      // (In this system, capacity is usually decremented upon verification/payment)
      prisma.slot.update({
        where: { id: booking.slotId! },
        data: {
          remainingCapacity: {
            decrement: booking.participantCount,
          },
        },
      }),
    ]);

    // 4. Audit Logging
    await logActivity(
      "MANUAL_PAYMENT_VERIFIED",
      auth.userId,
      "Booking",
      bookingId,
      {
        transactionId,
        amount: amountPaid,
        verifiedBy: auth.userId,
      }
    );

    // 5. Revalidate & Notify
    revalidatePath("/", "layout");
    
    // Send confirmation email (fire-and-forget)
    sendBookingConfirmationEmail(bookingId).catch(console.error);

    return NextResponse.json({
      success: true,
      message: "Manual payment verified and booking confirmed successfully.",
      booking: updatedBooking,
    });

  } catch (error) {
    console.error("Manual verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
