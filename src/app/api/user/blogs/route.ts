import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { generateSlug } from "@/lib/slugify";

/**
 * GET /api/user/blogs — list the calling user's own blogs
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("accessToken")?.value;
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = verifyAccessToken(token);
  if (!payload)
    return NextResponse.json({ error: "Invalid token." }, { status: 401 });

  const blogs = await prisma.blog.findMany({
    where: { authorId: payload.userId, deletedAt: null },
    include: {
      experience: { select: { id: true, title: true, slug: true } },
      coverImage: { select: { originalUrl: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ blogs });
}

/**
 * POST /api/user/blogs — create a new blog draft
 * Gate: user must have a CONFIRMED booking for the experience
 *       AND the trip slot date must be in the past (trip completed)
 * Constraint: one blog per (user, experience)
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get("accessToken")?.value;
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = verifyAccessToken(token);
  if (!payload)
    return NextResponse.json({ error: "Invalid token." }, { status: 401 });

  const body = await request.json();
  const { experienceId, title } = body;

  if (!experienceId || !title?.trim()) {
    return NextResponse.json(
      { error: "experienceId and title are required." },
      { status: 400 },
    );
  }

  // Gate: must have a CONFIRMED booking AND the trip must be completed (slot date in the past)
  const now = new Date();
  const confirmedBooking = await prisma.booking.findFirst({
    where: {
      userId: payload.userId,
      experienceId,
      bookingStatus: "CONFIRMED",
      deletedAt: null,
      slot: { date: { lt: now } },
    },
  });
  if (!confirmedBooking) {
    return NextResponse.json(
      {
        error:
          "You can only write about experiences where your trip has been completed (trip date must have passed).",
      },
      { status: 403 },
    );
  }

  // Constraint: one blog per (user, experience)
  const existing = await prisma.blog.findFirst({
    where: { authorId: payload.userId, experienceId, deletedAt: null },
  });
  if (existing) {
    return NextResponse.json(
      {
        error: "You have already written a blog about this experience.",
        blogId: existing.id,
      },
      { status: 409 },
    );
  }

  // Generate a unique slug
  const baseSlug = generateSlug(title);
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.blog.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const blog = await prisma.blog.create({
    data: {
      title: title.trim(),
      slug,
      content: { type: "doc", content: [] }, // empty Tiptap doc
      authorId: payload.userId,
      experienceId,
      status: "DRAFT",
    },
  });

  return NextResponse.json({ blog }, { status: 201 });
}
