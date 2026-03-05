import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

async function getAuthedBlog(request: NextRequest, id: string) {
  const token = request.cookies.get("accessToken")?.value;
  if (!token) return { error: "Unauthorized", status: 401 };
  const payload = verifyAccessToken(token);
  if (!payload) return { error: "Invalid token.", status: 401 };

  const blog = await prisma.blog.findUnique({ where: { id } });
  if (!blog || blog.deletedAt) return { error: "Blog not found.", status: 404 };
  if (blog.authorId !== payload.userId)
    return { error: "Forbidden.", status: 403 };
  return { blog, userId: payload.userId };
}

/**
 * PATCH /api/user/blogs/[id] — update title, content, coverImageId
 * Only allowed when status is DRAFT
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const result = await getAuthedBlog(request, id);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
  const { blog } = result;

  if (blog.status !== "DRAFT") {
    return NextResponse.json(
      {
        error:
          "Cannot edit a blog that is pending review or published. Wait for admin decision.",
      },
      { status: 400 },
    );
  }

  const body = await request.json();
  const { title, content, coverImageUrl, authorSocials, theme } = body;

  const updated = await prisma.blog.update({
    where: { id },
    data: {
      ...(title ? { title: title.trim() } : {}),
      ...(content === undefined ? {} : { content }),
      ...(coverImageUrl === undefined
        ? {}
        : { coverImageUrl: coverImageUrl || null }),
      ...(authorSocials === undefined ? {} : { authorSocials }),
      ...(theme === undefined ? {} : { theme }),
    },
  });

  return NextResponse.json({ blog: updated });
}

/**
 * DELETE /api/user/blogs/[id] — soft-delete a draft
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const result = await getAuthedBlog(request, id);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  await prisma.blog.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
