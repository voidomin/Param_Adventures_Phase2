import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/experiences/[slug]/slots
 * Public endpoint: returns available (non-full, future) slots for an experience.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  try {
    const experience = await prisma.experience.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!experience) {
      return NextResponse.json(
        { error: "Experience not found." },
        { status: 404 },
      );
    }

    const slots = await prisma.slot.findMany({
      where: {
        experienceId: experience.id,
        date: { gte: new Date() }, // Only future slots
        remainingCapacity: { gt: 0 }, // Only available slots
      },
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        capacity: true,
        remainingCapacity: true,
      },
    });

    return NextResponse.json({ slots });
  } catch (error) {
    console.error("Error fetching public slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch slots." },
      { status: 500 },
    );
  }
}
