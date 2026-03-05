import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

/**
 * GET /api/bookings/my
 * Returns the current user's bookings grouped by status:
 * pending, upcoming, past, cancelled.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: auth.userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        experience: {
          select: {
            title: true,
            slug: true,
            images: true,
            location: true,
            durationDays: true,
          },
        },
        slot: {
          select: {
            date: true,
          },
        },
        payments: {
          select: {
            id: true,
            providerOrderId: true,
            amount: true,
            status: true,
          },
        },
      },
    });

    const now = new Date();

    const upcoming = bookings.filter(
      (b) => b.bookingStatus === "CONFIRMED" && b.slot && b.slot.date >= now,
    );
    const past = bookings.filter(
      (b) => b.bookingStatus === "CONFIRMED" && b.slot && b.slot.date < now,
    );
    const pending = bookings.filter((b) => b.bookingStatus === "REQUESTED");
    const cancelled = bookings.filter((b) => b.bookingStatus === "CANCELLED");

    return NextResponse.json({
      upcoming,
      past,
      pending,
      cancelled,
    });
  } catch (error) {
    console.error("Fetch my bookings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings." },
      { status: 500 },
    );
  }
}
