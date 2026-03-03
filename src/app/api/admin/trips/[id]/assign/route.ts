import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

/**
 * POST /api/admin/trips/[id]/assign
 * Assigns a Trek Lead to a specific slot.
 * Body: { userId: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeRequest(request, "trip:moderate");
  if (!auth.authorized) return auth.response;

  try {
    const { id: slotId } = await params;
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required to assign a trek lead." },
        { status: 400 },
      );
    }

    // Verify user exists and has the Trek Lead role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || user.status !== "ACTIVE") {
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
  } catch (error: any) {
    if (error.code === "P2002") {
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
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeRequest(request, "trip:moderate");
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
