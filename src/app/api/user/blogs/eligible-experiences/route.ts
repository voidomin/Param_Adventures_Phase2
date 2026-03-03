import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";

/**
 * GET /api/user/blogs/eligible-experiences
 * Returns experiences the user has a CONFIRMED booking for
 * AND has not yet written a blog about.
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

  // Get confirmed bookings for distinct experiences not yet blogged
  const bookings = await prisma.booking.findMany({
    where: {
      userId: payload.userId,
      bookingStatus: "CONFIRMED",
      deletedAt: null,
      experienceId: { notIn: bloggedIds },
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
