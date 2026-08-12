-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "invoiceNumber" TEXT;

-- CreateTable
CREATE TABLE "InvoiceSequence" (
    "fiscalYear" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("fiscalYear")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_invoiceNumber_key" ON "Booking"("invoiceNumber");
