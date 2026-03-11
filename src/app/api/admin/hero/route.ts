import { NextResponse, NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
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

import { z } from "zod";

const heroSlideSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  subtitle: z.string().optional().nullable(),
  videoUrl: z.string().refine(
    (val) => {
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Invalid video URL" },
  ),
  ctaLink: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

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

    // ─── Validation ──────────────────────────────────────
    const parseResult = heroSlideSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { title, subtitle, videoUrl, ctaLink, isActive } = parseResult.data;

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

    revalidatePath("/", "layout");

    return NextResponse.json(slide, { status: 201 });
  } catch (error: unknown) {
    console.error("Create hero slide error:", error);
    return NextResponse.json(
      { error: "Failed to create hero slide" },
      { status: 500 },
    );
  }
}
