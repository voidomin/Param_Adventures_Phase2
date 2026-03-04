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

    const experiences = await prisma.experience.findMany({
      where,
      orderBy: { createdAt: "desc" },
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
