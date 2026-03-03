import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

/**
 * GET /api/admin/blogs — admin list of all blogs
 * Query params: status (DRAFT | PENDING_REVIEW | PUBLISHED), page, limit
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "blog:moderate");
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Number(searchParams.get("limit") ?? 20));
  const skip = (page - 1) * limit;

  const where = {
    deletedAt: null,
    ...(status
      ? { status: status as "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" }
      : {}),
  };

  const [blogs, total] = await Promise.all([
    prisma.blog.findMany({
      where,
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        experience: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.blog.count({ where }),
  ]);

  return NextResponse.json({
    blogs,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}
