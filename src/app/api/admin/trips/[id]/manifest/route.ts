import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

/**
 * GET /api/admin/trips/[id]/manifest
 * Trip Manager / Admin view of the participant manifest for a Slot.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeRequest(request, "trip:moderate");
  if (!auth.authorized) return auth.response;

  try {
    const { id: slotId } = await params;

    // Fetch confirmed bookings for this slot
    const bookings = await prisma.booking.findMany({
      where: {
        slotId,
        bookingStatus: "CONFIRMED",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ manifest: bookings });
  } catch (error) {
    console.error("Fetch manifest error:", error);
    return NextResponse.json(
      { error: "Failed to fetch manifest." },
      { status: 500 },
    );
  }
}
