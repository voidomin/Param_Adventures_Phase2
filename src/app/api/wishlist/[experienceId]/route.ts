import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

/**
 * DELETE /api/wishlist/[experienceId]
 * Removes an experience from the user's saved wishlist.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ experienceId: string }> },
) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  const resolvedParams = await params;
  const experienceId = resolvedParams.experienceId;

  try {
    const deleted = await prisma.savedExperience.deleteMany({
      where: {
        userId: auth.userId,
        experienceId: experienceId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "Experience not found in wishlist." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove from wishlist error:", error);
    return NextResponse.json(
      { error: "Failed to remove experience." },
      { status: 500 },
    );
  }
}
