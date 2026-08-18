import { prisma, runWithRetry } from "@/lib/db";
import { IST_OFFSET_MS } from "@/lib/ist-utils";

/**
 * Evaluates past slots and auto-completes them if the trek end date has passed.
 * Multi-day aware: endTimestamp = slot.date + (durationDays - 1) * 86400s.
 * Unlocks customer review eligibility (canReview = true) for active bookings.
 */
export async function autoCompletePastTrips(): Promise<{ completedCount: number; unlockedBookingsCount: number }> {
  try {
    const now = new Date();

    // Fetch past UPCOMING/ACTIVE/TREK_STARTED/TREK_ENDED slots with experience info
    const candidateSlots = await prisma.slot.findMany({
      where: {
        status: { in: ["UPCOMING", "ACTIVE", "TREK_STARTED", "TREK_ENDED"] },
        date: { lt: new Date(now.getTime() - 12 * 60 * 60 * 1000) }, // Departure date was at least 12h ago
      },
      include: {
        experience: { select: { durationDays: true } },
        bookings: { where: { bookingStatus: "CONFIRMED" }, select: { id: true, attended: true, canReview: true } },
      },
    });

    if (candidateSlots.length === 0) {
      return { completedCount: 0, unlockedBookingsCount: 0 };
    }

    let completedCount = 0;
    let unlockedBookingsCount = 0;

    for (const slot of candidateSlots) {
      const durationDays = Math.max(1, slot.experience?.durationDays || 1);
      // Compute trek end date: departure + (durationDays - 1) days
      const trekEndTimestamp = slot.date.getTime() + (durationDays - 1) * 24 * 60 * 60 * 1000;
      // Auto-complete if 24 hours have passed since the trek ended
      const minAutoCompleteTime = trekEndTimestamp + 24 * 60 * 60 * 1000;

      if (now.getTime() >= minAutoCompleteTime) {
        await runWithRetry(() =>
          prisma.$transaction(async (tx) => {
            // Update slot status to COMPLETED
            await tx.slot.update({
              where: { id: slot.id },
              data: { status: "COMPLETED", completedAt: new Date() },
            });

            // Unlock reviews & set attended = true for all confirmed bookings
            const updateRes = await tx.booking.updateMany({
              where: {
                slotId: slot.id,
                bookingStatus: "CONFIRMED",
              },
              data: {
                canReview: true,
                attended: true,
              },
            });

            // Also set attended = true for booking participants if not cancelled
            await tx.bookingParticipant.updateMany({
              where: {
                booking: { slotId: slot.id, bookingStatus: "CONFIRMED" },
                isCancelled: false,
              },
              data: { attended: true },
            });

            completedCount++;
            unlockedBookingsCount += updateRes.count;
          })
        );
      }
    }

    return { completedCount, unlockedBookingsCount };
  } catch (error) {
    console.error("[TripLifecycle] Error auto-completing past trips:", error);
    return { completedCount: 0, unlockedBookingsCount: 0 };
  }
}
