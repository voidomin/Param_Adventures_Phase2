import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";

/**
 * POST /api/admin/blogs/[id]/publish
 * Toggle blog status between PUBLISHED and DRAFT (unpublish/publish)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await authorizeRequest(request, ["blog:moderate", "media:upload"]);
  if (!auth.authorized) return auth.response;

  const blog = await prisma.blog.findUnique({ where: { id } });
  if (!blog || blog.deletedAt) {
    return NextResponse.json({ error: "Blog not found." }, { status: 404 });
  }

  const isPublishing = blog.status !== "PUBLISHED";

  // Prevent self-publishing a draft
  if (isPublishing && blog.authorId === auth.userId) {
    return NextResponse.json(
      { error: "You cannot self-publish your own blog. Another admin must approve it." },
      { status: 400 }
    );
  }

  const newStatus = isPublishing ? "PUBLISHED" : "DRAFT";

  const updated = await prisma.blog.update({
    where: { id },
    data: { status: newStatus, rejectionReason: null },
  });

  await logActivity(
    isPublishing ? "BLOG_APPROVED" : "BLOG_UNPUBLISHED",
    auth.userId,
    "Blog",
    id,
    { title: blog.title }
  );

  revalidatePath("/", "layout");

  return NextResponse.json({ blog: updated });
}
