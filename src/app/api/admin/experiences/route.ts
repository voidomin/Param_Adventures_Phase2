import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { ExperienceStatus, Difficulty } from "@prisma/client";
import { generateSlug } from "@/lib/slugify";
import { z } from "zod";

// GET /api/admin/experiences
export async function GET(request: NextRequest) {
  const result = await authorizeRequest(request, "trip:browse");
  if (!result.authorized) return result.response;

  try {
    const experiences = await prisma.experience.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        categories: { include: { category: true } },
        _count: { select: { slots: true, bookings: true } },
      },
    });

    return NextResponse.json({ experiences });
  } catch (err: unknown) {
    console.error("Failed to fetch experiences:", err);
    return NextResponse.json(
      { error: "Failed to fetch experiences" },
      { status: 500 },
    );
  }
}

// POST /api/admin/experiences schema
const experienceSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  description: z.any(), // JSON
  basePrice: z.number().min(0, "Base Price is required"),
  capacity: z.number().int().min(1, "Capacity must be at least 1"),
  durationDays: z.number().int().min(1, "Duration (Days) is required"),
  location: z.string().trim().min(1, "Location is required"),
  difficulty: z.enum(["EASY", "MODERATE", "HARD", "EXTREME"]).optional(),
  isFeatured: z.boolean().optional(),
  coverImage: z.string().min(1, "Cover Image is required").nullable(),
  cardImage: z.string().optional().nullable(),
  images: z.array(z.string().trim()).transform(arr => arr.filter(Boolean)).optional(),
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
  highlights: z.array(z.string().trim()).transform(arr => arr.filter(Boolean)).optional(),
  networkConnectivity: z.string().optional().nullable(),
  lastAtm: z.string().optional().nullable(),
  fitnessRequirement: z.string().optional().nullable(),
  ageRange: z.string().optional().nullable(),
  meetingTime: z.string().optional().nullable(),
  dropoffTime: z.string().optional().nullable(),
  vibeTags: z.array(z.string().trim()).transform(arr => arr.filter(Boolean)).optional(),
});

// POST /api/admin/experiences
export async function POST(request: NextRequest) {
  const result = await authorizeRequest(request, "trip:create");
  if (!result.authorized) return result.response;

  try {
    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = experienceSchema.safeParse(body);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string[]> = {};
      parseResult.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      });

      console.error("Experience Validation Failed:", fieldErrors);
      return NextResponse.json(
        {
          error: "Validation Failed",
          details: fieldErrors,
          message: parseResult.error.issues[0].message,
        },
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

    // Generate unique slug
    const baseSlug = generateSlug(title);
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (
      await prisma.experience.findUnique({ where: { slug: uniqueSlug } })
    ) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const newExperience = await prisma.experience.create({
      data: {
        title,
        slug: uniqueSlug,
        description,
        basePrice,
        capacity,
        durationDays: durationDays || 1,
        location: location || "",
        difficulty: difficulty || Difficulty.EASY,
        status: ExperienceStatus.DRAFT, // Always default to DRAFT on creation
        isFeatured: isFeatured || false,
        coverImage,
        cardImage,
        images: images || [],
        itinerary: itinerary || [],
        inclusions: inclusions || [],
        exclusions: exclusions || [],
        thingsToCarry: thingsToCarry || [],
        pickupPoints: pickupPoints || [],
        faqs: faqs || [],
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
        categories: (categoryIds && categoryIds.length > 0)
          ? {
              create: categoryIds.map((catId: string) => ({
                categoryId: catId,
              })),
            }
          : undefined,
      },
      include: {
        categories: { include: { category: true } },
      },
    });

    revalidatePath("/", "layout");

    return NextResponse.json(
      { message: "Experience created successfully", experience: newExperience },
      { status: 201 },
    );
  } catch (err: unknown) {
    console.error("Failed to create experience:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
