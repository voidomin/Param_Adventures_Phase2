import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const difficulty = searchParams.get("difficulty");

    // Build the query
    const where: Prisma.ExperienceWhereInput = {
      status: "PUBLISHED",
    };

    if (categoryId) {
      where.categories = {
        some: { categoryId },
      };
    }

    if (difficulty) {
      where.difficulty = difficulty as "EASY" | "MODERATE" | "HARD" | "EXTREME";
    }

    // Capped rather than paginated: the public list page filters/sorts this
    // entire set client-side for instant feedback (no round-trip per filter
    // change), so this is a safety net against unbounded growth rather than
    // a full paging implementation -- same trade-off as the admin list.
    const experiences = await prisma.experience.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        categories: {
          include: { category: true },
        },
      },
    });

    return NextResponse.json({ experiences });
  } catch (error: unknown) {
    console.error("Fetch experiences error:", error);
    return NextResponse.json(
      { error: "Failed to fetch experiences" },
      { status: 500 },
    );
  }
}
