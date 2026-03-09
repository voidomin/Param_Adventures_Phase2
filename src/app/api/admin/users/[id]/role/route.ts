import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { sendRoleAssignedEmail } from "@/lib/email";

// PATCH /api/admin/users/[id]/role
// Updates a user's role.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Initial authorization check
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

    // Check acting user's current record
    const actingUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: { role: true },
    });

    if (
      !actingUser ||
      !["ADMIN", "SUPER_ADMIN", "TRIP_MANAGER"].includes(actingUser.role.name)
    ) {
      return NextResponse.json(
        { error: "Unauthorized access: elevated privileges required." },
        { status: 403 },
      );
    }

    // Fetch the target user's current record
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

    // Fetch the target role details
    const targetRole = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!targetRole) {
      return NextResponse.json({ error: "Role not found." }, { status: 404 });
    }

    // ─── 1. Hierarchy Check ──────────────────────────────────
    const actorRole = actingUser.role.name;
    const newRole = targetRole.name;

    // RULE: Only SUPER_ADMIN can assign the SUPER_ADMIN role
    if (newRole === "SUPER_ADMIN" && actorRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only a SUPER_ADMIN can assign the SUPER_ADMIN role." },
        { status: 403 },
      );
    }

    // RULE: TRIP_MANAGER can only assign the TREK_LEAD role
    if (actorRole === "TRIP_MANAGER" && newRole !== "TREK_LEAD") {
      return NextResponse.json(
        { error: "TRIP_MANAGER can only assign the TREK_LEAD role." },
        { status: 403 },
      );
    }

    // RULE: Cannot modify a SUPER_ADMIN's role unless you are a SUPER_ADMIN
    if (targetUser.role.name === "SUPER_ADMIN" && actorRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Cannot modify a SUPER_ADMIN's role." },
        { status: 403 },
      );
    }

    // ─── 2. SUPER_ADMIN Allowlist Check ───────────────────────
    if (newRole === "SUPER_ADMIN") {
      const allowedEmailsRaw = process.env.SUPER_ADMIN_ALLOWED_EMAILS || "";
      const allowedEmails = allowedEmailsRaw
        .split(",")
        .map((e) => e.trim().toLowerCase());

      if (!allowedEmails.includes(targetUser.email.toLowerCase())) {
        return NextResponse.json(
          { error: "User email is not in the SUPER_ADMIN allowlist." },
          { status: 403 },
        );
      }
    }

    // ─── 3. Update the Role ──────────────────────────────────
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

    await logActivity("ROLE_ASSIGNED", auth.userId, "User", targetUserId, {
      newRole: updatedUser.role.name,
      targetEmail: updatedUser.email,
    });

    // Fire and forget email notification
    sendRoleAssignedEmail({
      userName: updatedUser.name || "User",
      userEmail: updatedUser.email,
      roleName: updatedUser.role.name,
    }).catch(console.error);

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Update role error:", error);
    return NextResponse.json(
      { error: "Failed to update role." },
      { status: 500 },
    );
  }
}
