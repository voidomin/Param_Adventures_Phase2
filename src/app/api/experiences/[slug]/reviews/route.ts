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

    return NextResponse.json({
      reviews,
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

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const { slug } = await params;
    const userId = auth.userId;
    const body = await request.json();

    const rating = Number.parseInt(body.rating);
    const reviewText = (body.reviewText || "").trim();

    if (Number.isNaN(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 },
      );
    }
    if (!reviewText || reviewText.length < 10) {
      return NextResponse.json(
        { error: "Review must be at least 10 characters long" },
        { status: 400 },
      );
    }

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
