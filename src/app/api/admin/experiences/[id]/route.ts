import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

import { generateSlug } from "@/lib/slugify";

// GET /api/admin/experiences/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await authorizeRequest(request, "trip:browse");
  if (!result.authorized) return result.response;

  const { id } = await params;

  try {
    const experience = await prisma.experience.findUnique({
      where: { id },
      include: {
        categories: { include: { category: true } },
      },
    });

    if (!experience) {
      return NextResponse.json(
        { error: "Experience not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ experience });
  } catch (err: unknown) {
    console.error("Failed to fetch experience:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// PUT /api/admin/experiences/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await authorizeRequest(request, "trip:edit");
  if (!result.authorized) return result.response;

  const { id } = await params;

  try {
    const existingExp = await prisma.experience.findUnique({ where: { id } });
    if (!existingExp) {
      return NextResponse.json(
        { error: "Experience not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      basePrice,
      capacity,
      durationDays,
      location,
      difficulty,
      status,
      isFeatured,
      images,
      itinerary,
      categoryIds,
    } = body;

    // Handle slug update if title changed
    let newSlug = existingExp.slug;
    if (title && title !== existingExp.title) {
      const baseSlug = generateSlug(title);
      newSlug = baseSlug;
      let counter = 1;
      while (
        await prisma.experience.findFirst({
          where: { slug: newSlug, id: { not: id } },
        })
      ) {
        newSlug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    // Execute everything in a transaction to handle relationship updates
    const updatedExperience = await prisma.$transaction(async (tx) => {
      // 1. Delete all existing category links
      if (categoryIds !== undefined) {
        await tx.experienceCategory.deleteMany({
          where: { experienceId: id },
        });
      }

      // 2. Update experience and recreate categories
      return await tx.experience.update({
        where: { id },
        data: {
          title,
          slug: newSlug,
          description,
          basePrice,
          capacity,
          durationDays,
          location,
          difficulty,
          status,
          isFeatured,
          images,
          itinerary,
          categories:
            categoryIds === undefined
              ? undefined
              : {
                  create: categoryIds.map((catId: string) => ({
                    categoryId: catId,
                  })),
                },
        },
        include: {
          categories: { include: { category: true } },
        },
      });
    });

    return NextResponse.json({
      message: "Experience updated successfully",
      experience: updatedExperience,
    });
  } catch (err: unknown) {
    console.error("Failed to update experience:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/experiences/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await authorizeRequest(request, "trip:edit"); // Assume edit perm implies soft delete
  if (!result.authorized) return result.response;

  const { id } = await params;

  try {
    const existingExp = await prisma.experience.findUnique({
      where: { id },
      include: {
        _count: { select: { bookings: true } },
      },
    });

    if (!existingExp) {
      return NextResponse.json(
        { error: "Experience not found" },
        { status: 404 },
      );
    }

    if (existingExp._count.bookings > 0) {
      // Soft Delete
      await prisma.experience.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return NextResponse.json({ message: "Experience soft-deleted" });
    } else {
      // Hard Delete
      await prisma.experience.delete({ where: { id } });
      return NextResponse.json({ message: "Experience permanently deleted" });
    }
  } catch (err: unknown) {
    console.error("Failed to delete experience:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
