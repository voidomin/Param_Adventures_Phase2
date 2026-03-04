import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

/**
 * GET /api/admin/users/trek-leads
 * Returns all active Trek Lead users.
 * Used to populate the "Assign Trek Lead" dropdown on the manager trip detail page.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const trekLeads = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        role: { name: "TREK_LEAD" },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ trekLeads });
  } catch (error) {
    console.error("Fetch trek leads error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trek leads." },
      { status: 500 },
    );
  }
}
