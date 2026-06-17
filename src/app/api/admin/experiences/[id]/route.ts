import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { generateSlug } from "@/lib/slugify";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/audit-logger";

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

    if (!experience || experience.deletedAt) {
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

const updateExperienceSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100).optional(),
  description: z.any().optional(), // JSON
  basePrice: z.number().min(0, "Base Price is required").optional(),
  capacity: z.number().int().min(1, "Capacity must be at least 1").optional(),
  durationDays: z.number().int().min(1, "Duration (Days) is required").optional(),
  location: z.string().trim().min(1, "Location is required").optional(),
  difficulty: z.enum(["EASY", "MODERATE", "HARD", "EXTREME"]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  isFeatured: z.boolean().optional(),
  coverImage: z.union([z.url({ message: "Invalid cover image URL" }), z.literal("")]).transform(val => val === "" ? null : val).optional().nullable(),
  cardImage: z.union([z.url({ message: "Invalid card image URL" }), z.literal("")]).transform(val => val === "" ? null : val).optional().nullable(),
  images: z.array(z.url({ message: "Invalid image URL" }).trim()).transform(arr => arr.filter(Boolean)).optional(),
  itinerary: z.any().optional(), // JSON
  categoryIds: z.array(z.string()).transform(arr => arr.filter(Boolean)).optional(),
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
  pickupPoints: z.array(z.string().trim()).transform(arr => arr.filter(Boolean)).optional(),
  dropPoints: z.array(z.string().trim()).transform(arr => arr.filter(Boolean)).optional(),
  highlights: z.array(z.string().trim()).transform(arr => arr.filter(Boolean)).optional(),
  networkConnectivity: z.string().optional().nullable(),
  lastAtm: z.string().optional().nullable(),
  fitnessRequirement: z.string().optional().nullable(),
  ageRange: z.string().optional().nullable(),
  meetingTime: z.string().optional().nullable(),
  dropoffTime: z.string().optional().nullable(),
  vibeTags: z.array(z.string().trim()).transform(arr => arr.filter(Boolean)).optional(),
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
      const fieldErrors: Record<string, string[]> = {};
      parseResult.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      });

      console.error("Experience Update Validation Failed:", fieldErrors);
      return NextResponse.json(
        {
          error: parseResult.error.issues[0].message,
          details: fieldErrors,
        },
        { status: 400 },
      );
    }

    const { categoryIds, ...directData } = parseResult.data;

    const existingExp = await prisma.experience.findUnique({ where: { id } });
    if (!existingExp || existingExp.deletedAt) {
      return NextResponse.json(
        { error: "Experience not found" },
        { status: 404 },
      );
    }

    // Handle slug update if title changed
    let newSlug = existingExp.slug;
    if (directData.title && directData.title !== existingExp.title) {
      const baseSlug = generateSlug(directData.title);
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
      // 1. Delete all existing category links if categoryIds is provided
      if (categoryIds !== undefined) {
        await tx.experienceCategory.deleteMany({
          where: { experienceId: id },
        });
      }

      // 2. Update experience and recreate categories
      return await tx.experience.update({
        where: { id },
        data: {
          ...directData,
          slug: newSlug,
          categories:
            (categoryIds === undefined || categoryIds.length === 0)
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

    await logActivity(
      "EXPERIENCE_UPDATED",
      result.userId,
      "Experience",
      id,
      { title: updatedExperience.title, status: updatedExperience.status }
    );

    revalidatePath("/", "layout");

    return NextResponse.json({
      message: "Experience updated successfully",
      experience: updatedExperience,
    });
  } catch (err: unknown) {
    console.error("Failed to update experience:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/experiences/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await authorizeRequest(request, "trip:edit");
  if (!result.authorized) return result.response;

  const { id } = await params;

  try {
    const existingExp = await prisma.experience.findUnique({
      where: { id },
    });

    if (!existingExp || existingExp.deletedAt) {
      return NextResponse.json(
        { error: "Experience not found" },
        { status: 404 },
      );
    }

    // Check if there are any slots or bookings at all
    const totalSlotsCount = await prisma.slot.count({
      where: { experienceId: id },
    });
    const totalBookingsCount = await prisma.booking.count({
      where: { experienceId: id },
    });

    if (totalSlotsCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete experience with active slots. Please delete the slots first." },
        { status: 400 },
      );
    }

    if (totalBookingsCount > 0) {
      // Soft Delete to retain history
      await prisma.experience.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await logActivity(
        "EXPERIENCE_DELETED",
        result.userId,
        "Experience",
        id,
        { title: existingExp.title, deleteType: "soft" }
      );
      revalidatePath("/", "layout");
      return NextResponse.json({ message: "Experience archived/soft-deleted to preserve booking records." });
    }

    // Hard Delete
    // Update any blogs referencing this experience to avoid foreign key issues
    await prisma.$transaction([
      prisma.blog.updateMany({
        where: { experienceId: id },
        data: { experienceId: null },
      }),
      prisma.experience.delete({ where: { id } }),
    ]);

    await logActivity(
      "EXPERIENCE_DELETED",
      result.userId,
      "Experience",
      id,
      { title: existingExp.title, deleteType: "hard" }
    );
    revalidatePath("/", "layout");
    return NextResponse.json({ message: "Experience permanently deleted" });
  } catch (err: unknown) {
    console.error("Failed to delete experience:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
