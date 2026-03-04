import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/manager/trips/[id]/start
 * Manager starts the trip — sets status ACTIVE, records startedAt.
 *
 * Validations:
 * - Caller must be the assigned manager OR Admin/Super Admin
 * - Trip must currently be UPCOMING (cannot re-start an active trip)
 * - At least 1 Trek Lead must be assigned
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const { id: slotId } = await params;
    const userId = auth.userId;

    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      include: {
        assignments: true,
        manager: { select: { id: true, name: true } },
      },
    });

    if (!slot) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }

    // Authorization: must be the assigned manager or admin
    const caller = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { name: true } } },
    });

    const isAdminOrAbove = ["ADMIN", "SUPER_ADMIN"].includes(
      caller?.role.name ?? "",
    );
    if (slot.managerId !== userId && !isAdminOrAbove) {
      return NextResponse.json(
        { error: "Only the assigned manager can start this trip." },
        { status: 403 },
      );
    }

    // Must be UPCOMING to start
    if (slot.status !== "UPCOMING") {
      return NextResponse.json(
        {
          error: `Trip is already ${slot.status.replace("_", " ").toLowerCase()}. Cannot start again.`,
        },
        { status: 409 },
      );
    }

    // Must have at least one trek lead assigned
    if (slot.assignments.length === 0) {
      return NextResponse.json(
        {
          error:
            "Cannot start the trip without assigning at least one Trek Lead.",
        },
        { status: 422 },
      );
    }

    // Start the trip
    const updated = await prisma.slot.update({
      where: { id: slotId },
      data: {
        status: "ACTIVE",
        startedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      status: updated.status,
      startedAt: updated.startedAt,
    });
  } catch (error) {
    console.error("Start trip error:", error);
    return NextResponse.json(
      { error: "Failed to start trip." },
      { status: 500 },
    );
  }
}
