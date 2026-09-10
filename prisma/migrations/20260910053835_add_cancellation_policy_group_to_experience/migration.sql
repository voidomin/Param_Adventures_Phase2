-- CreateEnum
CREATE TYPE "CancellationPolicyGroup" AS ENUM ('SHORT_TRIP', 'MULTI_DAY', 'INTERNATIONAL');

-- AlterTable
ALTER TABLE "Experience" ADD COLUMN     "cancellationPolicyGroup" "CancellationPolicyGroup" NOT NULL DEFAULT 'MULTI_DAY';

-- DataMigration: existing 1-2 day experiences default to SHORT_TRIP instead
-- of the column default (MULTI_DAY) -- there's no reliable existing signal
-- for INTERNATIONAL (location is free text), so any existing international
-- experiences need a manual one-time reclassification in the admin form.
UPDATE "Experience" SET "cancellationPolicyGroup" = 'SHORT_TRIP' WHERE "durationDays" <= 2;
