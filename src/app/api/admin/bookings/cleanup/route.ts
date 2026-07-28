import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";

function isValidCronSecret(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  return providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf);
}

/**
 * POST /api/admin/bookings/cleanup
 *
 * Target: Cancels bookings stuck in REQUESTED/PENDING state for more than
 * 30 minutes. These never held slot capacity in the first place --
 * remainingCapacity is only decremented once a booking is CONFIRMED (see
 * booking.service.ts) -- so this is pure housekeeping, not a capacity
 * restoration, despite what a stale earlier version of this comment implied.
 *
 * Auth: Requires "booking:moderate" permission,
 * OR a valid x-cron-secret header for automated jobs.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "booking:moderate");

  if (!auth.authorized) {
    const cronSecret = request.headers.get("x-cron-secret");
    if (!isValidCronSecret(cronSecret, process.env.CRON_SECRET)) {
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
        restoredCount++;
      }
    });

    if (auth.authorized && 'userId' in auth) {
        await logActivity("BOOKING_CLEANUP", auth.userId, "Booking", "bulk", { restoredCount });
    }

    return NextResponse.json({
      message: `Successfully cancelled ${restoredCount} abandoned booking(s).`,
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
