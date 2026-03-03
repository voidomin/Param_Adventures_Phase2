import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

// PATCH /api/admin/users/[id]/role
// Updates a user's role.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Requires "user:manage-roles" or ADMIN/SUPER_ADMIN
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const { id: targetUserId } = await params;
    const { roleId } = await request.json();

    if (!roleId) {
      return NextResponse.json(
        { error: "roleId is required" },
        { status: 400 },
      );
    }

    // Check acting user's role
    const actingUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: { role: true },
    });

    if (
      !actingUser ||
      !["ADMIN", "SUPER_ADMIN", "TRIP_MANAGER"].includes(actingUser.role.name)
    ) {
      return NextResponse.json(
        { error: "Unauthorized access: admin privileges required." },
        { status: 403 },
      );
    }

    // Fetch the target user's current role
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { role: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found." },
        { status: 404 },
      );
    }

    // Protection: Only SUPER_ADMIN can modify another SUPER_ADMIN's role
    if (
      targetUser.role.name === "SUPER_ADMIN" &&
      actingUser.role.name !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        { error: "Cannot modify a SUPER_ADMIN's role." },
        { status: 403 },
      );
    }

    // Protection: Normal admins cannot assign the SUPER_ADMIN role
    const targetRole = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!targetRole) {
      return NextResponse.json({ error: "Role not found." }, { status: 404 });
    }

    if (
      targetRole.name === "SUPER_ADMIN" &&
      actingUser.role.name !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        { error: "Cannot assign SUPER_ADMIN role." },
        { status: 403 },
      );
    }

    // Update the role
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { roleId },
      select: {
        id: true,
        name: true,
        email: true,
        role: { select: { name: true } },
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Update role error:", error);
    return NextResponse.json(
      { error: "Failed to update role." },
      { status: 500 },
    );
  }
}
