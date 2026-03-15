import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/story — Public. Returns all active StoryBlocks ordered by `order`.
 */
export async function GET() {
  try {
    const blocks = await prisma.storyBlock.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ blocks });
  } catch (error) {
    console.error("Error fetching story blocks:", error);
    return NextResponse.json(
      { error: "Failed to fetch story." },
      { status: 500 },
    );
  }
}
