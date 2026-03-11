/*
  Warnings:

  - The `description` column on the `Experience` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[fileHash]` on the table `Image` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'TREK_STARTED', 'TREK_ENDED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'CLOSED', 'DISCARDED');

-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'MANUAL';

-- AlterTable
ALTER TABLE "Blog" ADD COLUMN     "authorSocials" JSONB,
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'CLASSIC';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "attended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "baseFare" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "canReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxBreakdown" JSONB;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "icon" TEXT;

-- AlterTable
ALTER TABLE "Experience" ADD COLUMN     "ageRange" TEXT,
ADD COLUMN     "bestTimeToVisit" TEXT,
ADD COLUMN     "cancellationPolicy" TEXT,
ADD COLUMN     "cardImage" TEXT,
ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "dropPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "dropoffTime" TEXT,
ADD COLUMN     "exclusions" JSONB,
ADD COLUMN     "faqs" JSONB,
ADD COLUMN     "fitnessRequirement" TEXT,
ADD COLUMN     "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "inclusions" JSONB,
ADD COLUMN     "lastAtm" TEXT,
ADD COLUMN     "maxAltitude" TEXT,
ADD COLUMN     "maxGroupSize" INTEGER,
ADD COLUMN     "meetingPoint" TEXT,
ADD COLUMN     "meetingTime" TEXT,
ADD COLUMN     "minAge" INTEGER,
ADD COLUMN     "networkConnectivity" TEXT,
ADD COLUMN     "pickupPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "thingsToCarry" JSONB,
ADD COLUMN     "trekDistance" TEXT,
ADD COLUMN     "vibeTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "description",
ADD COLUMN     "description" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "fileHash" TEXT;

-- AlterTable
ALTER TABLE "Slot" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "managerId" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "status" "TripStatus" NOT NULL DEFAULT 'UPCOMING',
ADD COLUMN     "trekEndedAt" TIMESTAMP(3),
ADD COLUMN     "trekStartedAt" TIMESTAMP(3),
ADD COLUMN     "vendorContacts" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "age" INTEGER,
ADD COLUMN     "bloodGroup" TEXT,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactNumber" TEXT,
ADD COLUMN     "emergencyRelationship" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "BookingParticipant" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phoneNumber" TEXT,
    "gender" TEXT,
    "age" INTEGER,
    "bloodGroup" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactNumber" TEXT,
    "emergencyRelationship" TEXT,
    "pickupPoint" TEXT,
    "dropPoint" TEXT,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripLog" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "attendees" JSONB,
    "photoUrls" TEXT[],
    "trekLeadNote" TEXT,
    "managerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceReview" (
    "id" TEXT NOT NULL,
    "rating" SMALLINT NOT NULL,
    "reviewText" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isFeaturedHome" BOOLEAN NOT NULL DEFAULT false,
    "isFeaturedExperience" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperienceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedExperience" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "TripLog_slotId_key" ON "TripLog"("slotId");

-- CreateIndex
CREATE UNIQUE INDEX "ExperienceReview_experienceId_userId_key" ON "ExperienceReview"("experienceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedExperience_userId_experienceId_key" ON "SavedExperience"("userId", "experienceId");

-- CreateIndex
CREATE UNIQUE INDEX "Image_fileHash_key" ON "Image"("fileHash");

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingParticipant" ADD CONSTRAINT "BookingParticipant_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripLog" ADD CONSTRAINT "TripLog_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceReview" ADD CONSTRAINT "ExperienceReview_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceReview" ADD CONSTRAINT "ExperienceReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedExperience" ADD CONSTRAINT "SavedExperience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedExperience" ADD CONSTRAINT "SavedExperience_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;
