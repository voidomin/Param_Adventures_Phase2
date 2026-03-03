import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/experiences/[id]/slots — List all slots for an experience
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authorizeRequest(request, "trip:browse");
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;

  try {
    const slots = await prisma.slot.findMany({
      where: { experienceId: id },
      orderBy: { date: "asc" },
      include: {
        _count: { select: { bookings: true } },
      },
    });

    return NextResponse.json({ slots });
  } catch (error) {
    console.error("Error fetching slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch slots." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/experiences/[id]/slots — Create a new slot
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await authorizeRequest(request, "trip:create");
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;

  try {
    const experience = await prisma.experience.findUnique({ where: { id } });
    if (!experience) {
      return NextResponse.json(
        { error: "Experience not found." },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { date, capacity } = body;

    if (!date || !capacity || capacity <= 0) {
      return NextResponse.json(
        { error: "date and capacity (> 0) are required." },
        { status: 400 },
      );
    }

    const slot = await prisma.slot.create({
      data: {
        experienceId: id,
        date: new Date(date),
        capacity: Number(capacity),
        remainingCapacity: Number(capacity),
      },
    });

    return NextResponse.json({ slot }, { status: 201 });
  } catch (error) {
    console.error("Error creating slot:", error);
    return NextResponse.json(
      { error: "Failed to create slot." },
      { status: 500 },
    );
  }
}
