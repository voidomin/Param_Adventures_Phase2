import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { assignInvoiceNumberIfNeeded } from "../src/lib/invoice-numbering";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

/**
 * One-time backfill: assigns sequential, per-financial-year invoice
 * numbers to every existing booking that has received payment but
 * predates this feature. Ordered by createdAt ascending (a close proxy
 * for when each booking's first payment was actually confirmed, since
 * confirmation normally follows within minutes) so the resulting series
 * is chronological and gapless within each fiscal year -- important
 * since these numbers get reported against past GST returns, not just
 * future ones.
 *
 * Safe to re-run: assignInvoiceNumberIfNeeded is a no-op for any booking
 * that already has a number.
 */
async function run() {
  console.log("Starting invoice-number backfill...");

  const bookings = await prisma.booking.findMany({
    where: {
      invoiceNumber: null,
      paidAmount: { gt: 0 },
    },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${bookings.length} paid booking(s) missing an invoice number.`);

  let assignedCount = 0;

  for (const booking of bookings) {
    const invoiceNumber = await prisma.$transaction(
      (tx) => assignInvoiceNumberIfNeeded(tx, booking.id, booking.createdAt),
      { isolationLevel: "Serializable" },
    );
    console.log(`Booking ${booking.id} -> ${invoiceNumber}`);
    assignedCount++;
  }

  console.log(`Backfill complete. Assigned ${assignedCount} invoice number(s).`);
}

run()
  .catch((error) => {
    console.error("Error running invoice-number backfill:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    prisma.$disconnect();
  });
