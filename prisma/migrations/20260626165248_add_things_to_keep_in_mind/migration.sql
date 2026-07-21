-- CreateEnum (Conditional inside DO block)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BookingPaymentType') THEN
        CREATE TYPE "BookingPaymentType" AS ENUM ('FULL', 'ADVANCE');
    END IF;
END$$;

-- AlterEnum (Conditional inside DO block)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'PaymentStatus' AND e.enumlabel = 'PARTIALLY_PAID') THEN
        ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIALLY_PAID';
    END IF;
END$$;

-- AlterTable Booking
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paymentType" "BookingPaymentType" NOT NULL DEFAULT 'FULL';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "remainingBalance" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable BookingParticipant
ALTER TABLE "BookingParticipant" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "BookingParticipant" ADD COLUMN IF NOT EXISTS "selectedAmenities" JSONB DEFAULT '[]';

-- AlterTable CustomLead
ALTER TABLE "CustomLead" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'HOMEPAGE';

-- AlterTable Experience
ALTER TABLE "Experience" ADD COLUMN IF NOT EXISTS "advancePaymentAmount" DECIMAL(10,2);
ALTER TABLE "Experience" ADD COLUMN IF NOT EXISTS "allowAdvancePayment" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Experience" ADD COLUMN IF NOT EXISTS "extraAmenities" JSONB DEFAULT '[]';
ALTER TABLE "Experience" ADD COLUMN IF NOT EXISTS "thingsToKeepInMind" JSONB;

-- AlterTable User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);
