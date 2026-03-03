import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

// GET /api/admin/users?role=SOME_ROLE
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "trip:moderate"); // Or higher permission
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const roleName = searchParams.get("role");

    const whereClause: any = {
      status: "ACTIVE",
    };

    if (roleName) {
      whereClause.role = { name: roleName };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users." },
      { status: 500 },
    );
  }
}
