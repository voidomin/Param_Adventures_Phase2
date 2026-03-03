import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

interface RouteContext {
  params: Promise<{ id: string; slotId: string }>;
}

/**
 * PATCH /api/admin/experiences/[id]/slots/[slotId] — Update a slot
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await authorizeRequest(request, "trip:edit");
  if (!auth.authorized) return auth.response;

  const { slotId } = await context.params;

  try {
    const existing = await prisma.slot.findUnique({ where: { id: slotId } });
    if (!existing) {
      return NextResponse.json({ error: "Slot not found." }, { status: 404 });
    }

    const body = await request.json();
    const { date, capacity } = body;

    const data: Record<string, unknown> = {};
    if (date) data.date = new Date(date);
    if (capacity !== undefined) {
      const newCapacity = Number(capacity);
      if (newCapacity <= 0) {
        return NextResponse.json(
          { error: "Capacity must be greater than 0." },
          { status: 400 },
        );
      }
      // Adjust remaining capacity proportionally
      const bookedCount = existing.capacity - existing.remainingCapacity;
      data.capacity = newCapacity;
      data.remainingCapacity = Math.max(0, newCapacity - bookedCount);
    }

    const slot = await prisma.slot.update({
      where: { id: slotId },
      data,
    });

    return NextResponse.json({ slot });
  } catch (error) {
    console.error("Error updating slot:", error);
    return NextResponse.json(
      { error: "Failed to update slot." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/experiences/[id]/slots/[slotId] — Delete a slot
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authorizeRequest(request, "trip:edit");
  if (!auth.authorized) return auth.response;

  const { slotId } = await context.params;

  try {
    const existing = await prisma.slot.findUnique({
      where: { id: slotId },
      include: { _count: { select: { bookings: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Slot not found." }, { status: 404 });
    }

    if (existing._count.bookings > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${existing._count.bookings} booking(s) exist for this slot.`,
        },
        { status: 409 },
      );
    }

    await prisma.slot.delete({ where: { id: slotId } });
    return NextResponse.json({ message: "Slot deleted." });
  } catch (error) {
    console.error("Error deleting slot:", error);
    return NextResponse.json(
      { error: "Failed to delete slot." },
      { status: 500 },
    );
  }
}
