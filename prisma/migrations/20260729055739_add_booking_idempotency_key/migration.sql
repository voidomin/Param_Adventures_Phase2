-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE INDEX "Booking_userId_idempotencyKey_idx" ON "Booking"("userId", "idempotencyKey");
