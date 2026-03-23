import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { z } from "zod";

const managerAssignSchema = z.object({
  managerId: z.string().min(1, "managerId is required."),
});

const trekLeadAssignSchema = z.object({
  userId: z.string().min(1, "userId is required to assign a trek lead."),
});

/**
 * PATCH /api/admin/trips/[id]/assign
 * Assigns a Trip Manager to a slot.
 * Body: { managerId: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeRequest(request, "ops:assign-trek-leads");
  if (!auth.authorized) return auth.response;

  try {
    const { id: slotId } = await params;
    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = managerAssignSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { managerId } = parseResult.data;

    // Verify user exists and has Trip Manager role
    const user = await prisma.user.findUnique({
      where: { id: managerId },
      include: { role: true },
    });

    if (user?.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "User not found or inactive." },
        { status: 404 },
      );
    }

    const allowedRoles = ["TRIP_MANAGER", "ADMIN", "SUPER_ADMIN"];
    if (!allowedRoles.includes(user.role.name)) {
      return NextResponse.json(
        { error: "This user does not have the Trip Manager role." },
        { status: 403 },
      );
    }

    const slot = await prisma.slot.update({
      where: { id: slotId },
      data: { managerId },
      include: {
        manager: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ slot });
  } catch (error) {
    console.error("Assign Manager error:", error);
    return NextResponse.json(
      { error: "Failed to assign Trip Manager." },
      { status: 500 },
    );
  }
}

/**
 * Helper: resolves whether the caller is admin/super admin OR is the slot's assigned manager.
 */
async function canModifySlot(
  callerId: string,
  slotId: string,
): Promise<boolean> {
  const [caller, slot] = await Promise.all([
    prisma.user.findUnique({
      where: { id: callerId },
      select: { role: { select: { name: true } } },
    }),
    prisma.slot.findUnique({
      where: { id: slotId },
      select: { managerId: true },
    }),
  ]);

  if (!caller || !slot) return false;

  const isPrivileged = ["ADMIN", "SUPER_ADMIN"].includes(caller.role.name);
  const isAssignedManager = slot.managerId === callerId;

  return isPrivileged || isAssignedManager;
}

/**
 * POST /api/admin/trips/[id]/assign
 * Assigns a Trek Lead to a specific slot.
 * Allowed: Admin, Super Admin, or the assigned Trip Manager for this slot.
 * Body: { userId: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const { id: slotId } = await params;
    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = trekLeadAssignSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { userId } = parseResult.data;

    // Check permission: admin OR assigned manager
    const allowed = await canModifySlot(auth.userId, slotId);
    if (!allowed) {
      return NextResponse.json(
        { error: "You are not authorized to modify this trip." },
        { status: 403 },
      );
    }

    // Verify user exists and has the Trek Lead role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (user?.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "User not found or inactive." },
        { status: 404 },
      );
    }

    if (user.role.name !== "TREK_LEAD") {
      return NextResponse.json(
        { error: "This user does not have the Trek Lead role." },
        { status: 403 },
      );
    }

    // Assign to slot (create TripAssignment)
    const assignment = await prisma.tripAssignment.create({
      data: {
        slotId,
        trekLeadId: userId,
      },
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "User is already assigned to this trip." },
        { status: 409 },
      );
    }
    console.error("Assign Trek Lead error:", error);
    return NextResponse.json(
      { error: "Failed to assign Trek Lead." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/trips/[id]/assign?userId=xxx
 * Unassigns a Trek Lead from a slot.
 * Allowed: Admin, Super Admin, or the assigned Trip Manager for this slot.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const { id: slotId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId query parameter is required." },
        { status: 400 },
      );
    }

    // Check permission: admin OR assigned manager
    const allowed = await canModifySlot(auth.userId, slotId);
    if (!allowed) {
      return NextResponse.json(
        { error: "You are not authorized to modify this trip." },
        { status: 403 },
      );
    }

    await prisma.tripAssignment.deleteMany({
      where: {
        slotId,
        trekLeadId: userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove Trek Lead error:", error);
    return NextResponse.json(
      { error: "Failed to remove Trek Lead." },
      { status: 500 },
    );
  }
}
