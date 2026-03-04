/**
 * IST (Indian Standard Time = UTC+5:30) date utilities.
 * Used server-side to enforce D-Day constraints on trek lead actions.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in ms

/** Returns today's date string in IST: "YYYY-MM-DD" */
export function todayInIST(): string {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Returns a given Date's calendar date string in IST: "YYYY-MM-DD" */
export function dateInIST(date: Date): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Returns true if today (IST) matches the given slot date (IST).
 * Trek leads may only perform D-Day actions on the trip's exact calendar date.
 */
export function isSlotDayToday(slotDate: Date): boolean {
  return todayInIST() === dateInIST(slotDate);
}
