import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ slug: string }> };

/**
 * GET /api/blog/[slug] — public single blog article
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const { slug } = await params;

  const blog = await prisma.blog.findUnique({
    where: { slug },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      experience: {
        select: {
          id: true,
          title: true,
          slug: true,
          location: true,
          basePrice: true,
          images: true,
        },
      },
      coverImage: { select: { originalUrl: true } },
    },
  });

  if (blog?.status !== "PUBLISHED" || blog?.deletedAt) {
    return NextResponse.json({ error: "Blog not found." }, { status: 404 });
  }

  return NextResponse.json({ blog });
}
