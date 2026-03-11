import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

import { z } from "zod";

const blogReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().optional().nullable(),
}).refine(data => data.action !== "reject" || (data.rejectionReason && data.rejectionReason.trim().length > 0), {
  message: "A rejection reason is required when rejecting a blog.",
  path: ["rejectionReason"],
});

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

  try {
    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = blogReviewSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { action, rejectionReason } = parseResult.data;

    const updated = await prisma.blog.update({
      where: { id },
      data:
        action === "approve"
          ? { status: "PUBLISHED", rejectionReason: null }
          : { status: "DRAFT", rejectionReason: rejectionReason?.trim() || "Rejected by admin" },
    });

    revalidatePath("/", "layout");

    return NextResponse.json({ blog: updated });
  } catch (error) {
    console.error("POST /api/admin/blogs/[id]/review error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
