-- CreateEnum
CREATE TYPE "BookingPaymentType" AS ENUM ('FULL', 'ADVANCE');

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIALLY_PAID';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "paymentType" "BookingPaymentType" NOT NULL DEFAULT 'FULL',
ADD COLUMN     "remainingBalance" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "BookingParticipant" ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "selectedAmenities" JSONB DEFAULT '[]';

-- AlterTable
ALTER TABLE "CustomLead" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'HOMEPAGE';

-- AlterTable
ALTER TABLE "Experience" ADD COLUMN     "advancePaymentAmount" DECIMAL(10,2),
ADD COLUMN     "allowAdvancePayment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "extraAmenities" JSONB DEFAULT '[]',
ADD COLUMN     "thingsToKeepInMind" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dateOfBirth" TIMESTAMP(3);
