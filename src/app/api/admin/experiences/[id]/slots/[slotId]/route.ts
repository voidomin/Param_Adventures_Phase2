import { NextRequest, NextResponse } from "next/server";
import { prisma, runWithRetry } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { z } from "zod";
import { calculateRefundBreakdown } from "@/lib/refund-engine";
import { generateCouponCode } from "@/lib/coupon-engine";

const updateSlotSchema = z.object({
  date: z.iso.datetime().or(z.string().refine(val => !Number.isNaN(Date.parse(val)), "Invalid date format")).optional(),
  capacity: z.number().int().min(1, "Capacity must be at least 1").optional(),
  status: z.enum(["UPCOMING", "ACTIVE", "TREK_STARTED", "TREK_ENDED", "COMPLETED"]).optional(),
}).refine(data => data.date !== undefined || data.capacity !== undefined || data.status !== undefined, {
  message: "Date, capacity, or status must be provided.",
});

// PATCH /api/admin/experiences/[id]/slots/[slotId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; slotId: string }> },
) {
  const auth = await authorizeRequest(request, ["trip:create", "trip:edit"]);
  if (!auth.authorized) return auth.response;

  try {
    const { id, slotId } = await params;
    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = updateSlotSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { date, capacity, status } = parseResult.data;

    // Read-modify-write on capacity/remainingCapacity must be atomic
    const updatedSlot = await runWithRetry(() =>
      prisma.$transaction(async (tx) => {
        const slot = await tx.slot.findUnique({ where: { id: slotId } });

        if (slot?.experienceId !== id) {
          throw new Error("SLOT_NOT_FOUND");
        }

        if (date !== undefined) {
          const targetDate = new Date(date);
          const effectiveStatus = status ?? slot.status;
          if (targetDate < new Date() && effectiveStatus !== "COMPLETED") {
            throw new Error("NEW_DATE_IN_PAST: Departure date cannot be set to a past date for uncompleted trips.");
          }
        }

        const bookedCount = slot.capacity - slot.remainingCapacity;

        if (capacity !== undefined && capacity < bookedCount) {
          throw new Error(
            `CAPACITY_ERROR: Cannot reduce capacity below currently booked seats (${bookedCount}).`,
          );
        }

        const newCapacity = capacity ?? slot.capacity;
        const newRemaining = newCapacity - bookedCount;

        return tx.slot.update({
          where: { id: slotId },
          data: {
            ...(date && { date: new Date(date) }),
            ...(status && { status }),
            capacity: newCapacity,
            remainingCapacity: newRemaining,
          },
        });
      }, { isolationLevel: "Serializable" }),
    );

    await logActivity(
      "SLOT_UPDATED",
      auth.userId,
      "Slot",
      slotId,
      { date: updatedSlot.date, capacity: updatedSlot.capacity, status: updatedSlot.status }
    );

    return NextResponse.json({ slot: updatedSlot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "SLOT_NOT_FOUND") {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }
    if (message.startsWith("CAPACITY_ERROR: ")) {
      return NextResponse.json(
        { error: message.replace("CAPACITY_ERROR: ", "") },
        { status: 400 },
      );
    }
    if (message.startsWith("NEW_DATE_IN_PAST: ")) {
      return NextResponse.json(
        { error: message.replace("NEW_DATE_IN_PAST: ", "") },
        { status: 400 },
      );
    }
    console.error("Update slot error:", error);
    return NextResponse.json(
      { error: "Failed to update slot" },
      { status: 500 },
    );
  }
}


// DELETE /api/admin/experiences/[id]/slots/[slotId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; slotId: string }> },
) {
  const auth = await authorizeRequest(request, ["trip:create", "trip:edit"]);
  if (!auth.authorized) return auth.response;

  // Restrict slot deletion strictly to SUPER_ADMIN and ADMIN roles
  if (auth.roleName !== "SUPER_ADMIN" && auth.roleName !== "ADMIN") {
    return NextResponse.json(
      { error: "Insufficient permissions. Only administrators can delete trips." },
      { status: 403 },
    );
  }

  try {
    const { id, slotId } = await params;

    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
    });

    if (slot?.experienceId !== id) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    // Check for active/confirmed bookings on this slot
    const activeBookings = await prisma.booking.findMany({
      where: {
        slotId,
        bookingStatus: { in: ["CONFIRMED", "REQUESTED"] },
      },
    });

    // If deleting a slot with active bookings, run the 100% refund hook for all active bookings
    if (activeBookings.length > 0) {
      await runWithRetry(() =>
        prisma.$transaction(async (tx) => {
          for (const booking of activeBookings) {
            const breakdown = calculateRefundBreakdown({
              baseFare: Number(booking.baseFare),
              totalPrice: Number(booking.totalPrice),
              paidAmount: Number(booking.paidAmount),
              paymentType: booking.paymentType as "FULL" | "ADVANCE",
              refundPercent: 0,
              taxBreakdown: booking.taxBreakdown,
              isCompanyCancellation: true,
            });

            const finalRefund = breakdown.finalRefundAmount;

            await tx.booking.update({
              where: { id: booking.id },
              data: {
                bookingStatus: "CANCELLED",
                paymentStatus: Number(booking.paidAmount) > 0 ? "REFUND_PENDING" : booking.paymentStatus,
                cancelledAt: new Date(),
                cancellationReason: "Slot cancelled by management.",
                refundAmount: finalRefund > 0 ? finalRefund : null,
              },
            });

            if (Number(booking.paidAmount) > 0 && finalRefund > 0) {
              if (booking.refundPreference === "COUPON") {
                const couponCode = generateCouponCode("PARAM");
                const createdCoupon = await tx.travelCoupon.create({
                  data: {
                    code: couponCode,
                    customerId: booking.userId,
                    bookingId: booking.id,
                    originalValue: finalRefund,
                    balance: finalRefund,
                    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                    status: "ACTIVE",
                    type: "CANCELLATION",
                    reason: "100% Refund coupon for company-cancelled slot",
                  },
                });

                await tx.couponTransaction.create({
                  data: {
                    couponId: createdCoupon.id,
                    bookingId: booking.id,
                    type: "ISSUED",
                    amount: finalRefund,
                    previousBalance: 0,
                    newBalance: finalRefund,
                    remarks: "Issued for company-cancelled slot",
                  },
                });
              } else {
                await tx.refundRequest.upsert({
                  where: { bookingId: booking.id },
                  create: {
                    bookingId: booking.id,
                    customerId: booking.userId,
                    refundMethod: "BANK_TRANSFER",
                    baseFare: breakdown.baseFare,
                    gst: breakdown.gst,
                    convenienceFee: breakdown.convenienceFee,
                    cancellationPercent: 0,
                    cancellationCharges: 0,
                    finalRefundAmount: finalRefund,
                    status: "REQUESTED",
                    remarks: "Slot cancelled by management. Awaiting admin refund approval.",
                  },
                  update: {
                    finalRefundAmount: finalRefund,
                    status: "REQUESTED",
                    remarks: "Slot cancelled by management. Awaiting admin refund approval.",
                  },
                });
              }
            }
          }

          await tx.tripAssignment.deleteMany({ where: { slotId } });
          await tx.tripLog.deleteMany({ where: { slotId } });
          await tx.booking.updateMany({ where: { slotId }, data: { slotId: null } });
          await tx.slot.delete({ where: { id: slotId } });
        })
      );
    } else {
      await prisma.$transaction([
        prisma.tripAssignment.deleteMany({ where: { slotId } }),
        prisma.tripLog.deleteMany({ where: { slotId } }),
        prisma.booking.updateMany({ where: { slotId }, data: { slotId: null } }),
        prisma.slot.delete({ where: { id: slotId } }),
      ]);
    }

    await logActivity(
      "SLOT_DELETED",
      auth.userId,
      "Slot",
      slotId,
      {
        date: slot.date,
        cancelledBookingsCount: activeBookings.length,
        cancelledBookingIds: activeBookings.map((b) => b.id),
      }
    );

    return NextResponse.json({ success: true, processedRefundsCount: activeBookings.length });
  } catch (error) {
    console.error("Delete slot error:", error);
    return NextResponse.json(
      { error: "Failed to delete slot" },
      { status: 500 },
    );
  }
}
