import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { authorizeRequest } from "@/lib/api-auth";

// GET /api/admin/users?role=SOME_ROLE
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "user:view-all"); // Or higher permission
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const roleName = searchParams.get("role");
    const search = searchParams.get("search");
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? 50));
    const skip = (page - 1) * limit;

    const whereClause: Prisma.UserWhereInput = {
      status: "ACTIVE",
    };

    if (roleName && roleName !== "ALL") {
      whereClause.role = { name: roleName };
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, totalResult, totalActive, totalAdmins, totalCustomers, totalTrekLeads] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          role: { select: { name: true } },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where: whereClause }), // for pagination
      prisma.user.count({ where: { status: "ACTIVE" } }), // for stats
      prisma.user.count({ where: { status: "ACTIVE", role: { name: { in: ["ADMIN", "SUPER_ADMIN"] } } } }),
      prisma.user.count({ where: { status: "ACTIVE", role: { name: "CUSTOMER" } } }),
      prisma.user.count({ where: { status: "ACTIVE", role: { name: "TREK_LEAD" } } }),
    ]);

    return NextResponse.json({
      users,
      pagination: { total: totalResult, page, limit, totalPages: Math.ceil(totalResult / limit) },
      stats: {
        total: totalActive,
        admins: totalAdmins,
        customers: totalCustomers,
        trekLeads: totalTrekLeads,
      }
    });
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users." },
      { status: 500 },
    );
  }
}
