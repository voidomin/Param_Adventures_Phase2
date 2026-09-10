-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "balanceReminderSentAt" TIMESTAMP(3),
ADD COLUMN     "finalBalanceReminderSentAt" TIMESTAMP(3);
