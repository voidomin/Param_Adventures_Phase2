import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

// GET /api/admin/roles
// Fetch all system roles (excluding SUPER_ADMIN to prevent regular admins from over-privileging)
export async function GET(request: NextRequest) {
  // Require high-level permission or just system:config / user:manage-roles
  // We'll use "trip:moderate" or check for ADMIN role
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const userRole = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { role: { select: { name: true } } },
    });

    if (
      !userRole ||
      !["ADMIN", "SUPER_ADMIN", "TRIP_MANAGER"].includes(userRole.role.name)
    ) {
      return NextResponse.json(
        { error: "Unauthorized access." },
        { status: 403 },
      );
    }

    // Exclude GUEST (removed) and SUPER_ADMIN (unless acting user is SUPER_ADMIN)
    const excludedRoles = ["GUEST"];
    if (userRole.role.name !== "SUPER_ADMIN") {
      excludedRoles.push("SUPER_ADMIN");
    }

    const roles = await prisma.role.findMany({
      where: { name: { notIn: excludedRoles } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    return NextResponse.json({ roles });
  } catch (error) {
    console.error("Fetch roles error:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles." },
      { status: 500 },
    );
  }
}
