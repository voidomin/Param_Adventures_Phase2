import { prisma, runWithRetry } from "@/lib/db";
import { sendManagerUnassignedAlert, sendTrekLeadUnassignedAlert } from "@/lib/email";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Evaluates UPCOMING slots whose departure date has arrived and starts
 * them (status ACTIVE, startedAt set) -- the same effect as a manager
 * clicking "Start Trip" (see /api/manager/trips/[id]/start), just on a
 * schedule instead of waiting for someone to notice. Mirrors that manual
 * endpoint's one real safety check: a slot with no Trek Lead assigned is
 * left alone at UPCOMING (a genuine staffing gap, not something a cron
 * job should paper over) rather than silently marked active with nobody
 * assigned to run it.
 */
export async function autoStartTrips(): Promise<{ startedCount: number; skippedUnstaffedCount: number }> {
  try {
    const now = new Date();

    const candidateSlots = await prisma.slot.findMany({
      where: {
        status: "UPCOMING",
        date: { lte: now },
      },
      select: {
        id: true,
        assignments: { select: { id: true }, take: 1 },
      },
    });

    if (candidateSlots.length === 0) {
      return { startedCount: 0, skippedUnstaffedCount: 0 };
    }

    let startedCount = 0;
    let skippedUnstaffedCount = 0;

    for (const slot of candidateSlots) {
      if (slot.assignments.length === 0) {
        skippedUnstaffedCount++;
        continue;
      }

      await runWithRetry(() =>
        prisma.slot.update({
          where: { id: slot.id },
          data: { status: "ACTIVE", startedAt: now },
        })
      );
      startedCount++;
    }

    return { startedCount, skippedUnstaffedCount };
  } catch (error) {
    console.error("[TripLifecycle] Error auto-starting trips:", error);
    return { startedCount: 0, skippedUnstaffedCount: 0 };
  }
}

/**
 * Escalates two staffing gaps on UPCOMING slots as departure approaches,
 * each firing at most once per slot (tracked via managerEscalationSentAt /
 * trekLeadEscalationSentAt, same one-shot idempotency as
 * Booking.balanceReminderSentAt):
 *
 *  - No Trip Manager assigned at all (managerId is null), at 3 days or
 *    less to departure -- emailed to every active Admin/Super Admin,
 *    since only they can assign one (see PATCH /api/admin/trips/[id]/assign).
 *  - A Trip Manager is assigned but no Trek Lead is, at 1 day or less to
 *    departure -- emailed to that manager, since they (or an admin) are
 *    the only ones who can assign a Trek Lead. This is the same gap
 *    autoStartTrips already silently declines to paper over; this is
 *    what actually tells a human about it.
 *
 * Both thresholds use "days remaining <= N" rather than a tight window,
 * so an already-overdue unstaffed slot still fires on the next run
 * instead of silently missing its one shot.
 */
export async function sendStaffingEscalationAlerts(): Promise<{
  managerAlertsSent: number;
  trekLeadAlertsSent: number;
}> {
  try {
    const now = new Date();
    const managerThreshold = new Date(now.getTime() + 3 * DAY_MS);
    const trekLeadThreshold = new Date(now.getTime() + 1 * DAY_MS);

    let managerAlertsSent = 0;
    let trekLeadAlertsSent = 0;

    const unmanagedSlots = await prisma.slot.findMany({
      where: {
        status: "UPCOMING",
        managerId: null,
        managerEscalationSentAt: null,
        date: { lte: managerThreshold },
      },
      select: {
        id: true,
        date: true,
        experience: { select: { title: true } },
      },
    });

    if (unmanagedSlots.length > 0) {
      const admins = await prisma.user.findMany({
        where: {
          status: "ACTIVE",
          role: { name: { in: ["ADMIN", "SUPER_ADMIN"] } },
        },
        select: { email: true },
      });

      for (const slot of unmanagedSlots) {
        const daysUntilDeparture = Math.max(
          0,
          Math.ceil((slot.date.getTime() - now.getTime()) / DAY_MS),
        );

        for (const admin of admins) {
          await sendManagerUnassignedAlert({
            userEmail: admin.email,
            tripName: slot.experience.title,
            slotDate: slot.date,
            daysUntilDeparture,
          });
        }

        await runWithRetry(() =>
          prisma.slot.update({
            where: { id: slot.id },
            data: { managerEscalationSentAt: now },
          })
        );
        managerAlertsSent++;
      }
    }

    const unstaffedManagedSlots = await prisma.slot.findMany({
      where: {
        status: "UPCOMING",
        managerId: { not: null },
        trekLeadEscalationSentAt: null,
        date: { lte: trekLeadThreshold },
        assignments: { none: {} },
      },
      select: {
        id: true,
        date: true,
        experience: { select: { title: true } },
        manager: { select: { name: true, email: true } },
      },
    });

    for (const slot of unstaffedManagedSlots) {
      if (!slot.manager) continue;

      const daysUntilDeparture = Math.max(
        0,
        Math.ceil((slot.date.getTime() - now.getTime()) / DAY_MS),
      );

      await sendTrekLeadUnassignedAlert({
        userEmail: slot.manager.email,
        managerName: slot.manager.name || "Manager",
        tripName: slot.experience.title,
        slotDate: slot.date,
        daysUntilDeparture,
        slotId: slot.id,
      });

      await runWithRetry(() =>
        prisma.slot.update({
          where: { id: slot.id },
          data: { trekLeadEscalationSentAt: now },
        })
      );
      trekLeadAlertsSent++;
    }

    return { managerAlertsSent, trekLeadAlertsSent };
  } catch (error) {
    console.error("[TripLifecycle] Error sending staffing escalation alerts:", error);
    return { managerAlertsSent: 0, trekLeadAlertsSent: 0 };
  }
}

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
