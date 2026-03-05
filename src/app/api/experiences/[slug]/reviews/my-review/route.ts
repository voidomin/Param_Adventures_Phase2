import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * GET /api/experiences/[slug]/reviews/my-review
 *
 * Returns the current user's review (if any) for this experience,
 * plus whether they are eligible to review at all.
 *
 * Returns 401 if the user is not logged in.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const cookieToken = request.cookies.get("accessToken")?.value;
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : cookieToken;

  if (!token) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: "Invalid or expired token." },
      { status: 401 },
    );
  }

  try {
    const { slug } = await params;

    const experience = await prisma.experience.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!experience) {
      return NextResponse.json(
        { error: "Experience not found." },
        { status: 404 },
      );
    }

    const userId = payload.userId;

    // Check eligibility: confirmed, attended booking with canReview=true
    const eligibleBooking = await prisma.booking.findFirst({
      where: {
        userId,
        bookingStatus: "CONFIRMED",
        attended: true,
        canReview: true,
        slot: { experienceId: experience.id },
      },
      select: { id: true },
    });

    // Admins can always review
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(payload.roleName ?? "");
    const canReview = isAdmin || !!eligibleBooking;

    // Fetch any existing review by this user for this experience
    const review = await prisma.experienceReview.findUnique({
      where: {
        experienceId_userId: {
          experienceId: experience.id,
          userId,
        },
      },
      select: {
        id: true,
        rating: true,
        reviewText: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ review, canReview });
  } catch (error) {
    console.error("my-review fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch your review." },
      { status: 500 },
    );
  }
}
