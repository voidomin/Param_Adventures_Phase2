-- AlterTable
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorId_fkey";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledByUserId" TEXT,
ADD COLUMN     "refundNote" TEXT,
ADD COLUMN     "refundPreference" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp" DESC);
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_targetType_idx" ON "AuditLog"("targetType");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");
CREATE INDEX "Booking_experienceId_idx" ON "Booking"("experienceId");
CREATE INDEX "Booking_slotId_idx" ON "Booking"("slotId");
CREATE INDEX "Booking_bookingStatus_idx" ON "Booking"("bookingStatus");
CREATE INDEX "Booking_paymentStatus_idx" ON "Booking"("paymentStatus");
CREATE INDEX "Booking_createdAt_idx" ON "Booking"("createdAt");
CREATE INDEX "Booking_deletedAt_idx" ON "Booking"("deletedAt");

-- CreateIndex
CREATE INDEX "Experience_status_idx" ON "Experience"("status");
CREATE INDEX "Experience_isFeatured_idx" ON "Experience"("isFeatured");
CREATE INDEX "Experience_deletedAt_idx" ON "Experience"("deletedAt");

-- CreateIndex
CREATE INDEX "Slot_experienceId_idx" ON "Slot"("experienceId");
CREATE INDEX "Slot_date_idx" ON "Slot"("date");
CREATE INDEX "Slot_status_idx" ON "Slot"("status");
CREATE INDEX "Slot_managerId_idx" ON "Slot"("managerId");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
