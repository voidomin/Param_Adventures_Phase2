import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

/**
 * GET /api/wishlist
 * Returns all saved experiences for the current user.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const saved = await prisma.savedExperience.findMany({
      where: { userId: auth.userId },
      orderBy: { savedAt: "desc" },
      include: {
        experience: {
          select: {
            id: true,
            title: true,
            slug: true,
            images: true,
            location: true,
            basePrice: true,
            difficulty: true,
            categories: {
              include: {
                category: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ saved });
  } catch (error) {
    console.error("Fetch wishlist error:", error);
    return NextResponse.json(
      { error: "Failed to fetch wishlist." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/wishlist
 * Saves an experience for the current user.
 * Body: { experienceId }
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { experienceId } = body;

    if (!experienceId) {
      return NextResponse.json(
        { error: "experienceId is required." },
        { status: 400 },
      );
    }

    // Check if experience exists and is published
    const experience = await prisma.experience.findUnique({
      where: { id: experienceId },
    });

    if (!experience || experience.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "Experience not found." },
        { status: 404 },
      );
    }

    const saved = await prisma.savedExperience.upsert({
      where: {
        userId_experienceId: {
          userId: auth.userId,
          experienceId,
        },
      },
      update: {}, // Already saved
      create: {
        userId: auth.userId,
        experienceId,
      },
    });

    return NextResponse.json({ saved });
  } catch (error) {
    console.error("Save to wishlist error:", error);
    return NextResponse.json(
      { error: "Failed to save experience." },
      { status: 500 },
    );
  }
}
