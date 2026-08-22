import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { cookies } from "next/headers";

/**
 * GET /api/user/data-export
 * Self-service export of the logged-in user's own data (profile, bookings,
 * reviews, saved experiences, coupons) as downloadable JSON. Excludes
 * internal auth fields (password hash, tokenVersion, resetToken).
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        gender: true,
        dateOfBirth: true,
        bloodGroup: true,
        emergencyContactName: true,
        emergencyContactNumber: true,
        emergencyRelationship: true,
        bio: true,
        certifications: true,
        createdAt: true,
        role: { select: { name: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [bookings, reviews, savedExperiences, coupons] = await Promise.all([
      prisma.booking.findMany({
        where: { userId: payload.userId },
        select: {
          id: true,
          participantCount: true,
          totalPrice: true,
          paidAmount: true,
          bookingStatus: true,
          paymentStatus: true,
          createdAt: true,
          experience: { select: { title: true } },
          slot: { select: { date: true } },
          participants: {
            select: { name: true, email: true, phoneNumber: true, isPrimary: true },
          },
        },
      }),
      prisma.experienceReview.findMany({
        where: { userId: payload.userId },
        select: {
          id: true,
          rating: true,
          reviewText: true,
          createdAt: true,
          experience: { select: { title: true } },
        },
      }),
      prisma.savedExperience.findMany({
        where: { userId: payload.userId },
        select: { savedAt: true, experience: { select: { title: true } } },
      }),
      prisma.travelCoupon.findMany({
        where: { customerId: payload.userId },
        select: { code: true, balance: true, status: true, expiryDate: true, createdAt: true },
      }),
    ]);

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      profile: user,
      bookings,
      reviews,
      savedExperiences,
      coupons,
    });
  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json(
      { error: "Failed to export data. Please try again." },
      { status: 500 },
    );
  }
}
