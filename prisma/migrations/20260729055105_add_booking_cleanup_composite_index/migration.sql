-- CreateIndex
CREATE INDEX "Booking_bookingStatus_paymentStatus_createdAt_idx" ON "Booking"("bookingStatus", "paymentStatus", "createdAt");
