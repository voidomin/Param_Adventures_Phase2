import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

// GET /api/admin/experiences/[id]/slots - List all slots for an experience
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeRequest(request, ["trip:create", "trip:edit"]);
  // Assuming Trip Manager / Admin can view slots
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    const slots = await prisma.slot.findMany({
      where: { experienceId: id },
      orderBy: { date: "asc" },
      include: {
        _count: {
          select: {
            bookings: { where: { bookingStatus: { not: "CANCELLED" } } },
          },
        },
      },
    });

    return NextResponse.json({ slots });
  } catch (error) {
    console.error("Fetch slots error:", error);
    return NextResponse.json(
      { error: "Failed to fetch slots" },
      { status: 500 },
    );
  }
}

import { z } from "zod";

const slotSchema = z.object({
  date: z.iso.datetime().or(z.string().refine(val => !Number.isNaN(Date.parse(val)), "Invalid date format")),
  capacity: z.number().int().min(1, "Capacity must be at least 1"),
});

// POST /api/admin/experiences/[id]/slots - Create a new slot
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeRequest(request, ["trip:create", "trip:edit"]);
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = slotSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { date, capacity } = parseResult.data;

    const experience = await prisma.experience.findUnique({
      where: { id },
    });

    if (!experience) {
      return NextResponse.json(
        { error: "Experience not found" },
        { status: 404 },
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
    console.error("Create slot error:", error);
    return NextResponse.json(
      { error: "Failed to create slot" },
      { status: 500 },
    );
  }
}
