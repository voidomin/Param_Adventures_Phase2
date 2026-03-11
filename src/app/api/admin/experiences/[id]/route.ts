import { NextRequest, NextResponse } from "next/server";
// Trigger TS Re-check
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

import { generateSlug } from "@/lib/slugify";
import { revalidatePath } from "next/cache";

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

import { z } from "zod";

const updateExperienceSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.any().optional(), // JSON
  basePrice: z.number().min(0).optional(),
  capacity: z.number().int().min(1).optional(),
  durationDays: z.number().int().min(1).optional(),
  location: z.string().optional(),
  difficulty: z.enum(["EASY", "MODERATE", "HARD", "EXTREME"]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  isFeatured: z.boolean().optional(),
  coverImage: z
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
      { message: "Invalid cover image URL" },
    )
    .optional()
    .nullable(),
  cardImage: z
    .string()
    .refine(
      (val) => {
        if (!val) return true;
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Invalid card image URL" },
    )
    .optional()
    .nullable(),
  images: z
    .array(
      z.string().refine(
        (val) => {
          try {
            new URL(val);
            return true;
          } catch {
            return false;
          }
        },
        { message: "Invalid image URL" },
      ),
    )
    .optional(),
  itinerary: z.any().optional(), // JSON
  categoryIds: z.array(z.string()).optional(),
  inclusions: z.any().optional(),
  exclusions: z.any().optional(),
  thingsToCarry: z.any().optional(),
  faqs: z.any().optional(),
  cancellationPolicy: z.string().optional().nullable(),
  meetingPoint: z.string().optional().nullable(),
  minAge: z.number().int().optional().nullable(),
  maxAltitude: z.string().optional().nullable(),
  trekDistance: z.string().optional().nullable(),
  bestTimeToVisit: z.string().optional().nullable(),
  maxGroupSize: z.number().int().optional().nullable(),
  pickupPoints: z.array(z.string()).optional(),
  highlights: z.array(z.string()).optional(),
  networkConnectivity: z.string().optional().nullable(),
  lastAtm: z.string().optional().nullable(),
  fitnessRequirement: z.string().optional().nullable(),
  ageRange: z.string().optional().nullable(),
  meetingTime: z.string().optional().nullable(),
  dropoffTime: z.string().optional().nullable(),
  vibeTags: z.array(z.string()).optional(),
});

// PUT /api/admin/experiences/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await authorizeRequest(request, "trip:edit");
  if (!result.authorized) return result.response;

  const { id } = await params;

  try {
    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = updateExperienceSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
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
      coverImage,
      cardImage,
      images,
      itinerary,
      categoryIds,
      inclusions,
      exclusions,
      thingsToCarry,
      faqs,
      cancellationPolicy,
      meetingPoint,
      minAge,
      maxAltitude,
      trekDistance,
      bestTimeToVisit,
      maxGroupSize,
      pickupPoints,
      highlights,
      networkConnectivity,
      lastAtm,
      fitnessRequirement,
      ageRange,
      meetingTime,
      dropoffTime,
      vibeTags,
    } = parseResult.data;

    const existingExp = await prisma.experience.findUnique({ where: { id } });
    if (!existingExp) {
      return NextResponse.json(
        { error: "Experience not found" },
        { status: 404 },
      );
    }

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
          coverImage,
          cardImage,
          images,
          itinerary,
          inclusions,
          exclusions,
          thingsToCarry,
          pickupPoints,
          faqs,
          cancellationPolicy,
          meetingPoint,
          minAge,
          maxAltitude,
          trekDistance,
          bestTimeToVisit,
          maxGroupSize,
          highlights: highlights || [],
          networkConnectivity,
          lastAtm,
          fitnessRequirement,
          ageRange,
          meetingTime,
          dropoffTime,
          vibeTags: vibeTags || [],
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

    revalidatePath("/", "layout");

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
      revalidatePath("/", "layout");
      return NextResponse.json({ message: "Experience soft-deleted" });
    } else {
      // Hard Delete
      await prisma.experience.delete({ where: { id } });
      revalidatePath("/", "layout");
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
