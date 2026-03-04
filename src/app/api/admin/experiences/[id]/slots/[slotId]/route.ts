import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

// PATCH /api/admin/experiences/[id]/slots/[slotId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; slotId: string }> },
) {
  const auth = await authorizeRequest(request, "trip:moderate");
  if (!auth.authorized) return auth.response;

  try {
    const { id, slotId } = await params;
    const body = await request.json();
    const { date, capacity } = body;

    if (!date && typeof capacity !== "number") {
      return NextResponse.json(
        { error: "Date or capacity must be provided." },
        { status: 400 },
      );
    }

    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      include: {
        _count: {
          select: {
            bookings: { where: { bookingStatus: { not: "CANCELLED" } } },
          },
        },
      },
    });

    if (!slot || slot.experienceId !== id) {
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
  const auth = await authorizeRequest(request, "trip:moderate");
  if (!auth.authorized) return auth.response;

  try {
    const { id, slotId } = await params;

    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      include: {
        _count: {
          select: {
            bookings: { where: { bookingStatus: { not: "CANCELLED" } } },
          },
        },
      },
    });

    if (!slot || slot.experienceId !== id) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    if (slot._count.bookings > 0) {
      return NextResponse.json(
        { error: "Cannot delete a slot that has active bookings." },
        { status: 409 },
      );
    }

    await prisma.slot.delete({
      where: { id: slotId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete slot error:", error);
    return NextResponse.json(
      { error: "Failed to delete slot" },
      { status: 500 },
    );
  }
}
