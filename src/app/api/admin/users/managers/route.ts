import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

/**
 * GET /api/admin/users/managers
 * Returns all active users with TRIP_MANAGER, ADMIN, or SUPER_ADMIN roles.
 * Used to populate the "Assign Manager" dropdown on the Admin Trips page.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, [
    "trip:create",
    "ops:assign-trek-leads",
  ]);
  if (!auth.authorized) return auth.response;

  try {
    const managers = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        role: {
          name: "TRIP_MANAGER",
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ managers });
  } catch (error) {
    console.error("Fetch managers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch managers." },
      { status: 500 },
    );
  }
}
