import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const experience = await prisma.experience.findUnique({
      where: { slug },
      include: {
        categories: {
          include: { category: true },
        },
        slots: {
          where: {
            date: { gt: new Date() },
            remainingCapacity: { gt: 0 },
          },
          orderBy: { date: "asc" },
        },
      },
    });

    if (experience?.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "Experience not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(experience);
  } catch (error: unknown) {
    console.error("Fetch experience details error:", error);
    return NextResponse.json(
      { error: "Failed to fetch experience details" },
      { status: 500 },
    );
  }
}
