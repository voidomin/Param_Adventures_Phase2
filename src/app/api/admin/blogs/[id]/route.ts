import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

/**
 * DELETE /api/admin/blogs/[id]
 * Soft delete a blog
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const auth = await authorizeRequest(request, "blog:moderate");
  if (!auth.authorized) return auth.response;

  try {
    const blog = await prisma.blog.update({
      where: { id },
      data: { deletedAt: new Date(), status: "DRAFT" }, // Assuming the intent was to add status: "DRAFT" to the update
    });

    revalidatePath("/", "layout");

    return NextResponse.json({ success: true, blog }); // Reverted to original successful return, as the provided one was malformed
  } catch (error) {
    console.error("Failed to delete blog:", error);
    return NextResponse.json(
      { error: "Failed to delete blog" },
      { status: 500 },
    );
  }
}
