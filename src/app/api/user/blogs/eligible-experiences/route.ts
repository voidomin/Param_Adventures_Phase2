import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";

/**
 * GET /api/user/blogs/eligible-experiences
 * Returns experiences where:
 *   - User has a CONFIRMED booking
 *   - The slot date has already passed (trip is completed)
 *   - User has not yet written a blog about it
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("accessToken")?.value;
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = verifyAccessToken(token);
  if (!payload)
    return NextResponse.json({ error: "Invalid token." }, { status: 401 });

  // Get experienceIds already blogged about
  const existingBlogs = await prisma.blog.findMany({
    where: { authorId: payload.userId, deletedAt: null },
    select: { experienceId: true },
  });
  const bloggedIds = existingBlogs
    .map((b) => b.experienceId)
    .filter(Boolean) as string[];

  // Only return experiences where the trip is completed (slot date in the past)
  const now = new Date();
  const bookings = await prisma.booking.findMany({
    where: {
      userId: payload.userId,
      bookingStatus: "CONFIRMED",
      deletedAt: null,
      experienceId: { notIn: bloggedIds },
      slot: { date: { lt: now } }, // trip must have already happened
    },
    include: {
      experience: {
        select: { id: true, title: true, slug: true, location: true },
      },
    },
    distinct: ["experienceId"],
  });

  const experiences = bookings.map((b) => b.experience).filter(Boolean);

  return NextResponse.json({ experiences });
}
