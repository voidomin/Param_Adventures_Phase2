import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

import { z } from "zod";

const updateReviewSchema = z.object({
  isFeaturedHome: z.boolean().optional(),
  isFeaturedExperience: z.boolean().optional(),
}).refine(data => data.isFeaturedHome !== undefined || data.isFeaturedExperience !== undefined, {
  message: "Provide isFeaturedHome or isFeaturedExperience.",
});

/**
 * PATCH /api/admin/reviews/[id]
 * Toggles isFeaturedHome or isFeaturedExperience on a review.
 * Body: { isFeaturedHome?: boolean; isFeaturedExperience?: boolean }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  const isAdminOrAbove = ["ADMIN", "SUPER_ADMIN"].includes(auth.roleName);
  if (!isAdminOrAbove) {
    return NextResponse.json(
      { error: "Insufficient permissions." },
      { status: 403 },
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = updateReviewSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { isFeaturedHome, isFeaturedExperience } = parseResult.data;

    const updateData: Prisma.ExperienceReviewUpdateInput = {};

    if (isFeaturedHome !== undefined) {
      updateData.isFeaturedHome = isFeaturedHome;
    }
    if (isFeaturedExperience !== undefined) {
      updateData.isFeaturedExperience = isFeaturedExperience;
    }

    const review = await prisma.experienceReview.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { name: true } },
        experience: { select: { title: true, slug: true } },
      },
    });

    revalidatePath("/", "layout");

    return NextResponse.json({ review });
  } catch (error) {
    console.error("Admin review PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update review." },
      { status: 500 },
    );
  }
}
