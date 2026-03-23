import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPlainTextFromJSON } from "@/lib/utils/rich-text";

/**
 * GET /api/experiences/[slug]/itinerary-data
 * Public endpoint — returns all data needed for the PDF itinerary.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const experience = await prisma.experience.findUnique({
      where: { slug },
      include: {
        categories: {
          include: { category: { select: { name: true } } },
        },
      },
    });

    if (experience?.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "Experience not found" },
        { status: 404 }
      );
    }

    // Fetch company info for branding
    const settings = await prisma.platformSetting.findMany({
      where: {
        key: {
          in: [
            "companyName",
            "companyAddress",
            "companyPhone",
            "companyEmail",
          ],
        },
      },
    });

    const companyInfo = settings.reduce(
      (acc, s) => {
        acc[s.key] = s.value;
        return acc;
      },
      {} as Record<string, string>
    );

    // Extract plain text from rich-text description
    const descriptionText =
      experience.description &&
      typeof experience.description === "object"
        ? getPlainTextFromJSON(experience.description)
        : String(experience.description || "");

    return NextResponse.json({
      title: experience.title,
      slug: experience.slug,
      location: experience.location,
      durationDays: experience.durationDays,
      difficulty: experience.difficulty,
      basePrice: experience.basePrice,
      capacity: experience.capacity,
      coverImage: experience.coverImage,
      cardImage: experience.cardImage,
      images: experience.images,
      description: descriptionText,
      itinerary: experience.itinerary,
      inclusions: experience.inclusions,
      exclusions: experience.exclusions,
      thingsToCarry: experience.thingsToCarry,
      highlights: experience.highlights,
      cancellationPolicy: experience.cancellationPolicy,
      meetingPoint: experience.meetingPoint,
      meetingTime: experience.meetingTime,
      dropoffTime: experience.dropoffTime,
      maxAltitude: experience.maxAltitude,
      trekDistance: experience.trekDistance,
      bestTimeToVisit: experience.bestTimeToVisit,
      maxGroupSize: experience.maxGroupSize,
      minAge: experience.minAge,
      ageRange: experience.ageRange,
      networkConnectivity: experience.networkConnectivity,
      lastAtm: experience.lastAtm,
      fitnessRequirement: experience.fitnessRequirement,
      vibeTags: experience.vibeTags,
      categories: experience.categories.map((c) => c.category.name),
      company: {
        name: companyInfo.companyName || "Param Adventures",
        address: companyInfo.companyAddress || "",
        phone: companyInfo.companyPhone || "+91 98765 43210",
        email: companyInfo.companyEmail || "booking@paramadventures.in",
        website: "www.paramadventures.com",
      },
    });
  } catch (error) {
    console.error("Itinerary data fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch itinerary data." },
      { status: 500 }
    );
  }
}
