import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

/**
 * GET /api/trek-lead/assignments
 * Returns upcoming trips (Slots) that are specifically assigned to the logged-in user.
 */
export async function GET(request: Request) {
  // We use "booking:create" as a base permission, but we will strictly check the role.
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const userId = auth.userId;

    // Verify user is a TREK_LEAD (or has higher operational permissions)
    const userRole = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { name: true } } },
    });

    if (
      !userRole ||
      !["TREK_LEAD", "TRIP_MANAGER", "ADMIN", "SUPER_ADMIN"].includes(
        userRole.role.name,
      )
    ) {
      return NextResponse.json(
        { error: "Unauthorized access. Trek Lead role required." },
        { status: 403 },
      );
    }

    const assignments = await prisma.slot.findMany({
      where: {
        date: { gte: new Date() },
        assignments: {
          some: {
            trekLeadId: userId,
          },
        },
      },
      orderBy: { date: "asc" },
      include: {
        experience: {
          select: {
            title: true,
            location: true,
            durationDays: true,
          },
        },
        _count: {
          select: {
            bookings: {
              where: {
                bookingStatus: "CONFIRMED",
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("Fetch assignments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments." },
      { status: 500 },
    );
  }
}
