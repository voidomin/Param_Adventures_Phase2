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
    const updatedBooking = await prisma.$transaction(async (tx) => {
      const freshBooking = await tx.booking.findUnique({
        where: { id: bookingId },
      });

      if (!freshBooking) {
        throw new Error("Booking not found");
      }

      const newPaidAmount = Number(freshBooking.paidAmount) + amountPaid;
      const remainingBalance = Number(freshBooking.totalPrice) - newPaidAmount;
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

      await tx.payment.create({
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
      });

      // Clean up any pending payment records for this booking
      await tx.payment.deleteMany({
        where: { bookingId, status: "PENDING" },
      });

      if (freshBooking.slotId && freshBooking.bookingStatus !== "CONFIRMED") {
        await tx.slot.update({
          where: { id: freshBooking.slotId },
          data: {
            remainingCapacity: {
              decrement: freshBooking.participantCount,
            },
          },
        });

        // Cancel any other older pending/requested bookings for this user on the same slot
        await tx.booking.updateMany({
          where: {
            userId: freshBooking.userId,
            slotId: freshBooking.slotId,
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
      isolationLevel: "Serializable"
    });

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

  } catch (error: unknown) {
    console.error("Manual verification error:", error);
    
    // Catch unique constraint violation on providerPaymentId
    const err = error as { code?: string; meta?: { target?: string[] } };
    if (err.code === "P2002" && err.meta?.target?.includes("providerPaymentId")) {
      return NextResponse.json({
        error: "This Transaction ID / Reference has already been registered for another payment. Please verify the Reference ID and try again."
      }, { status: 400 });
    }

    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
