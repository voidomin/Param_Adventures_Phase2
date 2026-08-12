import { Prisma } from "@prisma/client";
import { IST_OFFSET_MS } from "@/lib/ist-utils";

const COMPANY_PREFIX = "PARAM";

/**
 * Indian financial year runs April 1 -- March 31 IST. A date in Jan/Feb/Mar
 * belongs to the FY that started the previous calendar year. Deliberately
 * shifts to IST before reading calendar components (same pattern as
 * lib/ist-utils.ts) rather than using local Date getters -- the server
 * runs in UTC in production, so a naive local-time check would misfire
 * right around the FY boundary (e.g. late March UTC evenings are already
 * April 1st in IST).
 */
export function getFinancialYearLabel(date: Date): string {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  const month = ist.getUTCMonth(); // 0-indexed; April = 3
  const startYear = month >= 3 ? ist.getUTCFullYear() : ist.getUTCFullYear() - 1;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
}

function formatInvoiceNumber(fiscalYear: string, sequenceNumber: number): string {
  // Padded to a 4-digit minimum (fits GST's 16-char invoice number limit
  // comfortably: "PARAM/26-27/0001" is 16 chars). Not a hard cap -- if a
  // fiscal year ever exceeds 9999 invoices this naturally grows to 5+
  // digits rather than truncating or wrapping.
  return `${COMPANY_PREFIX}/${fiscalYear}/${String(sequenceNumber).padStart(4, "0")}`;
}

function formatCreditNoteNumber(fiscalYear: string, sequenceNumber: number): string {
  // Separate series from invoices (own "CN" segment) -- GST requires each
  // document type to be internally sequential, not that they share one
  // number pool. Not fully certain whether the 16-char cap that applies to
  // invoice numbers (Rule 46) also applies to credit notes (Rule 53) --
  // rather than assume it doesn't, this stays within 16 chars too:
  // "PARAM/CN/26/0001" is 16 chars (FY as a single start-year digit pair
  // instead of invoice numbers' "26-27" span, to make room for "/CN").
  return `${COMPANY_PREFIX}/CN/${fiscalYear.slice(0, 2)}/${String(sequenceNumber).padStart(4, "0")}`;
}

/**
 * Assigns a sequential, gapless invoice number to a booking the first
 * time it receives payment (advance or full). Idempotent -- calling this
 * again on a booking that already has a number (e.g. a later balance
 * payment, or a retried/replayed webhook) is a safe no-op that returns
 * the existing number unchanged. This is deliberate: GST expects one
 * invoice per supply, updated as payments come in, not a new invoice
 * number per payment event.
 *
 * Must be called inside the same Serializable transaction as the
 * payment-confirming update, so the increment on InvoiceSequence and the
 * write to Booking.invoiceNumber are atomic with the payment itself --
 * two concurrent payments confirming at the same instant can't collide
 * on the same number.
 */
export async function assignInvoiceNumberIfNeeded(
  tx: Prisma.TransactionClient,
  bookingId: string,
  now: Date = new Date(),
): Promise<string> {
  const existing = await tx.booking.findUnique({
    where: { id: bookingId },
    select: { invoiceNumber: true },
  });

  if (existing?.invoiceNumber) {
    return existing.invoiceNumber;
  }

  const fiscalYear = getFinancialYearLabel(now);

  const sequence = await tx.invoiceSequence.upsert({
    where: { fiscalYear },
    create: { fiscalYear, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });

  const invoiceNumber = formatInvoiceNumber(fiscalYear, sequence.lastNumber);

  await tx.booking.update({
    where: { id: bookingId },
    data: { invoiceNumber },
  });

  return invoiceNumber;
}

/**
 * Issues a credit note for a genuine refund event -- money actually being
 * credited back against a previously invoiced booking (a cancellation, a
 * partial-participant cancellation, an admin-adjusted refund). Unlike
 * assignInvoiceNumberIfNeeded, this is NOT idempotent by design: a booking
 * can be legitimately refunded more than once (e.g. two separate
 * participants cancelling out of the same multi-pax booking on different
 * days), and each real refund event is its own credit note against the
 * original invoice, never reusing another event's number. Call this once
 * per actual refund resolution, not speculatively.
 *
 * Must be called inside the same Serializable transaction as the
 * refund-resolving update, for the same race-safety reason as
 * assignInvoiceNumberIfNeeded.
 */
export async function issueCreditNote(
  tx: Prisma.TransactionClient,
  params: { bookingId: string; amount: number; reason?: string | null },
  now: Date = new Date(),
): Promise<string> {
  const fiscalYear = getFinancialYearLabel(now);

  const sequence = await tx.creditNoteSequence.upsert({
    where: { fiscalYear },
    create: { fiscalYear, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });

  const creditNoteNumber = formatCreditNoteNumber(fiscalYear, sequence.lastNumber);

  await tx.creditNote.create({
    data: {
      bookingId: params.bookingId,
      creditNoteNumber,
      amount: params.amount,
      reason: params.reason ?? null,
    },
  });

  return creditNoteNumber;
}
