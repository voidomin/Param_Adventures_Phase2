import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;

    const experience = await prisma.experience.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!experience) {
      return NextResponse.json(
        { error: "Experience not found" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const [reviews, totalCount, aggregations, groupedByRating] =
      await Promise.all([
        prisma.experienceReview.findMany({
          where: { experienceId: experience.id },
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.experienceReview.count({
          where: { experienceId: experience.id },
        }),
        prisma.experienceReview.aggregate({
          where: { experienceId: experience.id },
          _avg: { rating: true },
        }),
        prisma.experienceReview.groupBy({
          by: ["rating"],
          where: { experienceId: experience.id },
          _count: { rating: true },
        }),
      ]);

    // Convert groupBy result to a flat { 1: n, 2: n, ... } map
    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of groupedByRating) {
      breakdown[row.rating] = row._count.rating;
    }

    // Fetch the featured pull-quote for this experience (if any).
    // The explicit JS check below guards against any Prisma filter caching issue:
    // even if the WHERE clause is silently ignored, we only return it when the
    // flag is actually true on the returned row.
    const rawFeatured = await prisma.experienceReview.findFirst({
      where: {
        experienceId: experience.id,
        isFeaturedExperience: true,
      },
      include: { user: { select: { name: true } } },
    });
    const featuredReview =
      rawFeatured?.isFeaturedExperience === true ? rawFeatured : null;

    // Exclude the featured review from the regular list to avoid showing it twice.
    const reviewList = featuredReview
      ? reviews.filter((r) => r.id !== featuredReview.id)
      : reviews;

    return NextResponse.json({
      reviews: reviewList,
      featuredReview,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats: {
        averageRating: aggregations._avg.rating || 0,
        totalReviews: totalCount,
        breakdown,
      },
    });
  } catch (error) {
    console.error("Fetch reviews error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 },
    );
  }
}

import { z } from "zod";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().min(10, "Review must be at least 10 characters long").max(1000),
});

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const { slug } = await params;
    const userId = auth.userId;
    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = reviewSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { rating, reviewText } = parseResult.data;

    const experience = await prisma.experience.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!experience) {
      return NextResponse.json(
        { error: "Experience not found" },
        { status: 404 },
      );
    }

    // Check if the user is eligible to review (has a CONFIRMED, attended booking with canReview=true)
    const eligibleBooking = await prisma.booking.findFirst({
      where: {
        userId,
        bookingStatus: "CONFIRMED",
        attended: true,
        canReview: true,
        slot: { experienceId: experience.id },
      },
    });

    if (
      !eligibleBooking &&
      auth.roleName !== "ADMIN" &&
      auth.roleName !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        { error: "You can only review experiences you have completed." },
        { status: 403 },
      );
    }

    // Upsert the review (one per user per experience)
    const reviewResult = await prisma.experienceReview.upsert({
      where: {
        experienceId_userId: {
          experienceId: experience.id,
          userId,
        },
      },
      create: {
        experienceId: experience.id,
        userId,
        rating,
        reviewText,
      },
      update: {
        rating,
        reviewText,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ review: reviewResult });
  } catch (error) {
    console.error("Submit review error:", error);
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 },
    );
  }
}
