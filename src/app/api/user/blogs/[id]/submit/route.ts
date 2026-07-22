import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/user/blogs/[id]/submit — submit a blog for admin review
 * Transitions DRAFT → PENDING_REVIEW
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const token = request.cookies.get("accessToken")?.value;
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyAccessToken(token);
  if (!payload)
    return NextResponse.json({ error: "Invalid token." }, { status: 401 });

  const blog = await prisma.blog.findUnique({ where: { id } });
  if (!blog || blog.deletedAt) {
    return NextResponse.json({ error: "Blog not found." }, { status: 404 });
  }
  if (blog.authorId !== payload.userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (blog.status !== "DRAFT" && blog.status !== "PUBLISHED") {
    return NextResponse.json(
      { error: "Only drafts or published blogs can be submitted for review." },
      { status: 400 },
    );
  }

  // Validate content is not empty
  let hasContent = false;
  const contentValue = blog.content;
  if (contentValue) {
    if (typeof contentValue === "string") {
      const trimmed = contentValue.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          const parsed = JSON.parse(trimmed);
          hasContent = Array.isArray(parsed?.content) && parsed.content.length > 0;
        } catch {
          const stripped = trimmed.replace(/<[^>]*>/g, "").trim();
          hasContent = stripped.length > 0;
        }
      } else {
        const stripped = trimmed.replace(/<[^>]*>/g, "").trim();
        hasContent = stripped.length > 0;
      }
    } else if (typeof contentValue === "object") {
      const doc = contentValue as { content?: unknown[] };
      hasContent = Array.isArray(doc?.content) && doc.content.length > 0;
    }
  }

  if (!blog.title.trim() || !hasContent) {
    return NextResponse.json(
      {
        error:
          "Blog must have a title and content before submitting for review.",
      },
      { status: 400 },
    );
  }

  const updated = await prisma.blog.update({
    where: { id },
    data: { status: "PENDING_REVIEW", rejectionReason: null },
  });

  revalidatePath("/", "layout");

  return NextResponse.json({ blog: updated });
}
