import type { Experience, Slot } from "@prisma/client";

type ExperienceWithCardRelations = Experience & {
  categories: { category: { id: string; name: string; slug: string } }[];
  slots: Pick<Slot, "date" | "capacity" | "remainingCapacity">[];
};

/**
 * Converts a raw Prisma Experience (with its categories/upcoming-slots
 * relations loaded) into the plain, JSON-serializable shape ExperienceCard
 * expects -- Decimal fields as numbers, Date fields as ISO strings, plus
 * the derived nextDeparture/nextDepartureSlot/upcomingSlots fields the card
 * renders. Every homepage section that reuses the real ExperienceCard
 * shares this one conversion instead of each repeating it.
 */
export function serializeExperienceForCard(exp: ExperienceWithCardRelations) {
  const validSlots = exp.slots.filter((slot) => {
    if (!slot.date) return false;
    const d = slot.date instanceof Date ? slot.date : new Date(slot.date);
    return !Number.isNaN(d.getTime());
  });

  const firstSlot = validSlots[0];
  let nextDeparture: string | null = null;
  let nextDepartureSlot = null;

  if (firstSlot?.date) {
    const dateObj = firstSlot.date instanceof Date ? firstSlot.date : new Date(firstSlot.date);
    const isoDate = dateObj.toISOString();
    nextDeparture = isoDate;
    nextDepartureSlot = {
      date: isoDate,
      capacity: firstSlot.capacity ?? exp.capacity,
      remainingCapacity: firstSlot.remainingCapacity ?? exp.capacity,
    };
  }

  return {
    ...exp,
    basePrice: Number(exp.basePrice),
    advancePaymentAmount: exp.advancePaymentAmount ? Number(exp.advancePaymentAmount) : null,
    nextDeparture,
    nextDepartureSlot,
    upcomingSlots: validSlots.map((slot) => {
      const slotDate = slot.date instanceof Date ? slot.date : new Date(slot.date);
      return {
        date: slotDate.toISOString(),
        capacity: slot.capacity ?? exp.capacity,
        remainingCapacity: slot.remainingCapacity ?? exp.capacity,
      };
    }),
  };
}
