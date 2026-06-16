import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";

import { z } from "zod";

const updateSlotSchema = z.object({
  date: z.iso.datetime().or(z.string().refine(val => !Number.isNaN(Date.parse(val)), "Invalid date format")).optional(),
  capacity: z.number().int().min(1, "Capacity must be at least 1").optional(),
}).refine(data => data.date !== undefined || data.capacity !== undefined, {
  message: "Date or capacity must be provided.",
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
    const { date, capacity } = parseResult.data;

    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      include: {
        _count: {
          select: {
            bookings: { where: { bookingStatus: "CONFIRMED" } },
          },
        },
      },
    });

    if (slot?.experienceId !== id) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    const bookedCount = slot.capacity - slot.remainingCapacity;

    if (capacity !== undefined) {
      if (capacity < bookedCount) {
        return NextResponse.json(
          {
            error: `Cannot reduce capacity below currently booked seats (${bookedCount}).`,
          },
          { status: 400 },
        );
      }
    }

    const newCapacity = capacity ?? slot.capacity;
    const newRemaining = newCapacity - bookedCount;

    const updatedSlot = await prisma.slot.update({
      where: { id: slotId },
      data: {
        ...(date && { date: new Date(date) }),
        capacity: newCapacity,
        remainingCapacity: newRemaining,
      },
    });

    await logActivity(
      "SLOT_UPDATED",
      auth.userId,
      "Slot",
      slotId,
      { date: updatedSlot.date, capacity: updatedSlot.capacity }
    );

    return NextResponse.json({ slot: updatedSlot });
  } catch (error) {
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

    // Check if slot has active/confirmed bookings
    const activeBookingsCount = await prisma.booking.count({
      where: {
        slotId,
        bookingStatus: "CONFIRMED",
      },
    });

    if (activeBookingsCount > 0 && slot.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Cannot delete slot with active/confirmed bookings unless the trip is completed." },
        { status: 400 },
      );
    }

    // Fetch associated bookings before deletion for audit logging
    const associatedBookings = await prisma.booking.findMany({
      where: { slotId },
      select: { id: true, userId: true },
    });

    // Safely delete the slot and all related assignments/logs, and disassociate bookings
    await prisma.$transaction([
      prisma.tripAssignment.deleteMany({
        where: { slotId },
      }),
      prisma.tripLog.deleteMany({
        where: { slotId },
      }),
      prisma.booking.updateMany({
        where: { slotId },
        data: { slotId: null },
      }),
      prisma.slot.delete({
        where: { id: slotId },
      }),
    ]);

    await logActivity(
      "SLOT_DELETED",
      auth.userId,
      "Slot",
      slotId,
      {
        date: slot.date,
        disassociatedBookingsCount: associatedBookings.length,
        disassociatedBookingIds: associatedBookings.map((b) => b.id),
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete slot error:", error);
    return NextResponse.json(
      { error: "Failed to delete slot" },
      { status: 500 },
    );
  }
}
