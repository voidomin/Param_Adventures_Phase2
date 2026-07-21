-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "refundAmount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "BookingParticipant" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "isCancelled" BOOLEAN NOT NULL DEFAULT false;
