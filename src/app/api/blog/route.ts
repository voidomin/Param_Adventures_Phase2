import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/blog — public paginated listing of PUBLISHED blogs
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(24, Number(searchParams.get("limit") ?? 12));
  const skip = (page - 1) * limit;

  const [blogs, total] = await Promise.all([
    prisma.blog.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        experience: {
          select: { id: true, title: true, slug: true, location: true },
        },
        coverImage: { select: { originalUrl: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.blog.count({ where: { status: "PUBLISHED", deletedAt: null } }),
  ]);

  return NextResponse.json({
    blogs,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}
