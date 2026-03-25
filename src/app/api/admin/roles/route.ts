import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

// GET /api/admin/roles
// Fetch all system roles (filtered by the acting user's permissions)
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { role: { select: { name: true } } },
    });

    if (
      !user ||
      !["ADMIN", "SUPER_ADMIN", "TRIP_MANAGER"].includes(user.role.name)
    ) {
      return NextResponse.json(
        { error: "Unauthorized access: admin privileges required." },
        { status: 403 },
      );
    }

    const actorRole = user.role.name;

    // ─── Filter Logic ────────────────────────────────────────
    // These roles are always excluded from assignment (e.g. system internals)
    const alwaysExcluded = ["GUEST", "USER"]; // USER is usually manually assigned but let's see

    let whereClause: any = {
      name: { notIn: [...alwaysExcluded] },
    };

    if (actorRole === "ADMIN") {
      // Sees everything EXCEPT SUPER_ADMIN
      whereClause.name.notIn.push("SUPER_ADMIN");
    } else if (actorRole === "TRIP_MANAGER") {
      // Only sees TREK_LEAD (as requested: "electric manager can assign a trick lead")
      whereClause = {
        name: "TREK_LEAD",
      };
    }

    const roles = await prisma.role.findMany({
      where: whereClause,
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
