import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { ExperienceStatus, Difficulty } from "@prisma/client";

import { generateSlug } from "@/lib/slugify";

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

// POST /api/admin/experiences
export async function POST(request: NextRequest) {
  const result = await authorizeRequest(request, "trip:create");
  if (!result.authorized) return result.response;

  try {
    const body = await request.json();
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
    } = body;

    // Validate essential fields
    if (
      !title ||
      !description ||
      basePrice === undefined ||
      capacity === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields (title, description, basePrice, capacity)",
        },
        { status: 400 },
      );
    }

    // Generate unique slug
    let baseSlug = generateSlug(title);
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
        categories: categoryIds
          ? {
              create: categoryIds.map((catId: string) => ({
                category: { connect: { id: catId } },
              })),
            }
          : undefined,
      },
      include: {
        categories: { include: { category: true } },
      },
    });

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
