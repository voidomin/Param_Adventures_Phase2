import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/blogs/[id]/review
 * Body: { action: "approve" | "reject", rejectionReason?: string }
 * approve: PENDING_REVIEW → PUBLISHED
 * reject:  PENDING_REVIEW → DRAFT + sets rejectionReason
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const auth = await authorizeRequest(request, "blog:moderate");
  if (!auth.authorized) return auth.response;

  const blog = await prisma.blog.findUnique({ where: { id } });
  if (!blog || blog.deletedAt) {
    return NextResponse.json({ error: "Blog not found." }, { status: 404 });
  }
  if (blog.status !== "PENDING_REVIEW") {
    return NextResponse.json(
      { error: "Only blogs with PENDING_REVIEW status can be reviewed." },
      { status: 400 },
    );
  }

  const body = await request.json();
  const { action, rejectionReason } = body;

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      { error: "action must be 'approve' or 'reject'." },
      { status: 400 },
    );
  }

  if (action === "reject" && !rejectionReason?.trim()) {
    return NextResponse.json(
      { error: "A rejection reason is required when rejecting a blog." },
      { status: 400 },
    );
  }

  const updated = await prisma.blog.update({
    where: { id },
    data:
      action === "approve"
        ? { status: "PUBLISHED", rejectionReason: null }
        : { status: "DRAFT", rejectionReason: rejectionReason.trim() },
  });

  return NextResponse.json({ blog: updated });
}
