import { NextResponse, NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authorizeRequest(request, [
      "trip:create",
      "system:config",
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const slide = await prisma.heroSlide.findUnique({
      where: { id },
    });

    if (!slide) {
      return NextResponse.json({ error: "Slide not found" }, { status: 404 });
    }

    return NextResponse.json(slide);
  } catch (error: unknown) {
    console.error("Fetch hero slide error:", error);
    return NextResponse.json(
      { error: "Failed to fetch hero slide" },
      { status: 500 },
    );
  }
}

import { z } from "zod";

const updateHeroSlideSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  subtitle: z.string().optional().nullable(),
  videoUrl: z
    .string()
    .refine(
      (val: string) => {
        if (!val) return true;
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Invalid video URL" },
    )
    .optional(),
  ctaLink: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  order: z.number().int().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authorizeRequest(request, [
      "trip:create",
      "system:config",
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = updateHeroSlideSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { title, subtitle, videoUrl, ctaLink, isActive, order } = parseResult.data;

    const updatedSlide = await prisma.heroSlide.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(subtitle !== undefined && { subtitle }),
        ...(videoUrl !== undefined && { videoUrl }),
        ...(ctaLink !== undefined && { ctaLink }),
        ...(isActive !== undefined && { isActive }),
        ...(order !== undefined && { order }),
      },
    });

    revalidatePath("/", "layout");

    return NextResponse.json(updatedSlide);
  } catch (error: unknown) {
    console.error("Update hero slide error:", error);
    return NextResponse.json(
      { error: "Failed to update hero slide" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authorizeRequest(request, [
      "trip:create",
      "system:config",
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    await prisma.heroSlide.delete({
      where: { id },
    });

    revalidatePath("/", "layout");

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete hero slide error:", error);
    return NextResponse.json(
      { error: "Failed to delete hero slide" },
      { status: 500 },
    );
  }
}
