import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/manager/trips/[id]
 * Returns full slot detail: experience, bookings list, trek lead assignments, vendor contacts.
 * Only accessible to the manager assigned to this slot.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const { id: slotId } = await params;
    const userId = auth.userId;

    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      include: {
        experience: {
          select: {
            id: true,
            title: true,
            location: true,
            durationDays: true,
            images: true,
            difficulty: true,
          },
        },
        manager: { select: { id: true, name: true, email: true } },
        assignments: {
          include: {
            trekLead: { select: { id: true, name: true, email: true } },
          },
        },
        bookings: {
          where: { bookingStatus: "CONFIRMED", deletedAt: null },
          include: {
            participants: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        tripLog: true,
      },
    });

    if (!slot) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }

    // Only the assigned manager (or admin) can view this
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { name: true } } },
    });

    const isAdminOrAbove = ["ADMIN", "SUPER_ADMIN"].includes(
      user?.role.name ?? "",
    );

    if (slot.managerId !== userId && !isAdminOrAbove) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    return NextResponse.json({ slot });
  } catch (error) {
    console.error("Manager trip detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trip details." },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/manager/trips/[id]
 * Allows the assigned manager to update vendorContacts on the slot.
 * Body: { vendorContacts: [{label: string, value: string}] }
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const { id: slotId } = await params;
    const userId = auth.userId;
    const body = await request.json();
    const { vendorContacts } = body;

    // Verify this manager owns the slot
    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      select: { managerId: true },
    });

    if (!slot) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { name: true } } },
    });

    const isAdminOrAbove = ["ADMIN", "SUPER_ADMIN"].includes(
      user?.role.name ?? "",
    );

    if (slot.managerId !== userId && !isAdminOrAbove) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const updated = await prisma.slot.update({
      where: { id: slotId },
      data: { vendorContacts },
    });

    return NextResponse.json({ slot: updated });
  } catch (error) {
    console.error("Update vendor contacts error:", error);
    return NextResponse.json(
      { error: "Failed to update trip details." },
      { status: 500 },
    );
  }
}
