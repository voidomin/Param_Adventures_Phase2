import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { sanitizeEditorContent } from "@/lib/sanitize";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const blogUpdateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  content: z.any().optional(), // JSON
  coverImageUrl: z.string().url("Invalid cover image URL").optional().nullable(),
  authorSocials: z.any().optional(), // JSON
  theme: z.enum(["CLASSIC", "MODERN", "MINIMAL"]).optional(),
});

async function getAuthedBlog(request: NextRequest, id: string) {
  const token = request.cookies.get("accessToken")?.value;
  if (!token) return { error: "Unauthorized", status: 401 };
  const payload = await verifyAccessToken(token);
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

  try {
    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = blogUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { title, content, coverImageUrl, authorSocials, theme } = parseResult.data;

    const sanitizedContent =
      content === undefined ? undefined : sanitizeEditorContent(content);

    const updated = await prisma.blog.update({
      where: { id },
      data: {
        ...(title ? { title: title.trim() } : {}),
        ...(sanitizedContent === undefined ? {} : { content: sanitizedContent }),
        ...(coverImageUrl === undefined
          ? {}
          : { coverImageUrl: coverImageUrl || null }),
        ...(authorSocials === undefined ? {} : { authorSocials }),
        ...(theme === undefined ? {} : { theme }),
      },
    });

    revalidatePath("/", "layout");

    return NextResponse.json({ blog: updated });
  } catch (error) {
    console.error("PATCH /api/user/blogs/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
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

  revalidatePath("/", "layout");

  return NextResponse.json({ success: true });
}
