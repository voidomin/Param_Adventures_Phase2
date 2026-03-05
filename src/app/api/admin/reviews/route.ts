import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

/**
 * GET /api/admin/reviews
 * Returns paginated list of all experience reviews for admin management.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  const isAdminOrAbove = ["ADMIN", "SUPER_ADMIN"].includes(auth.roleName);
  if (!isAdminOrAbove) {
    return NextResponse.json(
      { error: "Insufficient permissions." },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(searchParams.get("limit") || "20")),
  );
  const skip = (page - 1) * limit;
  const experienceFilter = searchParams.get("experienceId") || undefined;

  const where = experienceFilter ? { experienceId: experienceFilter } : {};

  const [reviews, total] = await Promise.all([
    prisma.experienceReview.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        experience: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.experienceReview.count({ where }),
  ]);

  return NextResponse.json({
    reviews,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}
