import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/reviews/[id]
 * Toggles isFeaturedHome or isFeaturedExperience on a review.
 * Body: { isFeaturedHome?: boolean; isFeaturedExperience?: boolean }
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
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

    const updateData: Prisma.ExperienceReviewUpdateInput = {};

    if (typeof body.isFeaturedHome === "boolean") {
      updateData.isFeaturedHome = body.isFeaturedHome;
    }
    if (typeof body.isFeaturedExperience === "boolean") {
      updateData.isFeaturedExperience = body.isFeaturedExperience;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Provide isFeaturedHome or isFeaturedExperience." },
        { status: 400 },
      );
    }

    const review = await prisma.experienceReview.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { name: true } },
        experience: { select: { title: true, slug: true } },
      },
    });

    return NextResponse.json({ review });
  } catch (error) {
    console.error("Admin review PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update review." },
      { status: 500 },
    );
  }
}
