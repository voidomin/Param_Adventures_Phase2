import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";

/**
 * POST /api/admin/bookings/cleanup
 * 
 * Target: Cleans up (cancels) bookings that are stuck in REQUESTED/PENDING state
 * for more than 30 minutes, freeing up the blocked capacity slot.
 * 
 * Auth: Requires "booking:moderate" permission, 
 * OR a valid x-cron-secret header for automated jobs.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "booking:moderate");
  
  if (!auth.authorized) {
    const cronSecret = request.headers.get("x-cron-secret");
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
       return auth.response;
    }
  }

  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const abandonedBookings = await prisma.booking.findMany({
      where: {
        bookingStatus: "REQUESTED",
        paymentStatus: "PENDING",
        createdAt: { lt: thirtyMinutesAgo },
      },
      select: {
        id: true,
        slotId: true,
        participantCount: true,
      },
    });

    if (abandonedBookings.length === 0) {
      return NextResponse.json({ message: "No abandoned bookings found.", count: 0 });
    }

    let restoredCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const booking of abandonedBookings) {
        await tx.booking.update({
          where: { id: booking.id },
          data: { bookingStatus: "CANCELLED", paymentStatus: "FAILED" },
        });

        if (booking.slotId) {
          await tx.slot.update({
            where: { id: booking.slotId },
            data: { remainingCapacity: { increment: booking.participantCount } },
          });
        }
        restoredCount++;
      }
    });

    if (auth.authorized && 'userId' in auth) {
        await logActivity("BOOKING_CLEANUP", auth.userId, "Booking", "bulk", { restoredCount });
    }

    return NextResponse.json({
      message: `Successfully cleaned up and restored capacity for ${restoredCount} abandoned bookings.`,
      count: restoredCount,
    });
  } catch (error) {
    console.error("Cleanup abandoned bookings error:", error);
    return NextResponse.json(
      { error: "Failed to cleanup abandoned bookings." },
      { status: 500 },
    );
  }
}
