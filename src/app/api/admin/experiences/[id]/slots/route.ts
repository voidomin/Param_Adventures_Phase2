import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

// GET /api/admin/experiences/[id]/slots - List all slots for an experience
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeRequest(request, "trip:moderate");
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

// POST /api/admin/experiences/[id]/slots - Create a new slot
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeRequest(request, "trip:moderate"); // Need to verify correct permission
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    const { date, capacity } = await request.json();

    if (!date || !capacity || capacity < 1) {
      return NextResponse.json(
        { error: "Valid date and capacity (>0) are required." },
        { status: 400 },
      );
    }

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
