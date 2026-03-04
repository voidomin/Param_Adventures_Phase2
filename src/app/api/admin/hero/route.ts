import { NextResponse, NextRequest } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeRequest(request, [
      "trip:create",
      "system:config",
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const slides = await prisma.heroSlide.findMany({
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ slides });
  } catch (error: unknown) {
    console.error("Fetch hero slides error:", error);
    return NextResponse.json(
      { error: "Failed to fetch hero slides" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeRequest(request, [
      "trip:create",
      "system:config",
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { title, subtitle, videoUrl, ctaLink, isActive } = body;

    if (!title || !videoUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Determine the next order index
    const lastSlide = await prisma.heroSlide.findFirst({
      orderBy: { order: "desc" },
    });
    const order = lastSlide ? lastSlide.order + 1 : 0;

    const slide = await prisma.heroSlide.create({
      data: {
        title,
        subtitle,
        videoUrl,
        ctaLink,
        isActive: isActive ?? true,
        order,
      },
    });

    return NextResponse.json(slide, { status: 201 });
  } catch (error: unknown) {
    console.error("Create hero slide error:", error);
    return NextResponse.json(
      { error: "Failed to create hero slide" },
      { status: 500 },
    );
  }
}
