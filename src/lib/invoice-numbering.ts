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
