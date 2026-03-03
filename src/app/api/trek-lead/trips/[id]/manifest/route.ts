import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

/**
 * GET /api/trek-lead/trips/[id]/manifest
 * Trek Lead view of the participant manifest for an assigned Slot.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const { id: slotId } = await params;
    const userId = auth.userId;

    // Verify user is assigned to this exact slot OR is an Admin/Trip Manager
    const userRole = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { name: true } } },
    });

    const isInternalManagement = [
      "ADMIN",
      "SUPER_ADMIN",
      "TRIP_MANAGER",
    ].includes(userRole?.role?.name || "");

    if (!isInternalManagement) {
      const assignment = await prisma.tripAssignment.findUnique({
        where: {
          slotId_trekLeadId: {
            slotId,
            trekLeadId: userId,
          },
        },
      });

      if (!assignment) {
        return NextResponse.json(
          { error: "Unauthorized. You are not assigned to this trip." },
          { status: 403 },
        );
      }
    }

    // Fetch the slot and confirmed bookings
    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      include: {
        experience: { select: { title: true, location: true } },
      },
    });

    if (!slot) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

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

    return NextResponse.json({ trip: slot, manifest: bookings });
  } catch (error) {
    console.error("Fetch trek lead manifest error:", error);
    return NextResponse.json(
      { error: "Failed to fetch manifest." },
      { status: 500 },
    );
  }
}
