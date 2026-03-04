import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const payload = verifyAccessToken(accessToken);
  if (!payload) {
    return NextResponse.json({ error: "Invalid token." }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        phoneNumber: true,
        createdAt: true,
        role: { select: { name: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const allBookings = await prisma.booking.findMany({
      where: { userId: payload.userId, deletedAt: null },
      include: {
        experience: {
          select: {
            id: true,
            title: true,
            slug: true,
            location: true,
            durationDays: true,
            images: true,
            difficulty: true,
          },
        },
        slot: { select: { date: true, capacity: true, status: true } },
        payments: {
          select: { status: true, amount: true, method: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();

    const upcomingBookings = allBookings.filter((b) => {
      const isNotCancelled = b.bookingStatus !== "CANCELLED";
      const isNotCompleted = b.slot?.status !== "COMPLETED";
      // It's future if there's no slot date, or if the date is >= now.
      const isFuture = b.slot ? new Date(b.slot.date) >= now : true;
      return isNotCancelled && isNotCompleted && isFuture;
    });

    const pastBookings = allBookings.filter((b) => {
      const isCancelled = b.bookingStatus === "CANCELLED";
      const isCompleted = b.slot?.status === "COMPLETED";
      const isPast = b.slot ? new Date(b.slot.date) < now : false;
      return isCancelled || isCompleted || isPast;
    });

    return NextResponse.json({
      user: {
        ...user,
        roleName: user.role.name,
      },
      upcomingBookings,
      pastBookings,
      stats: {
        total: allBookings.length,
        upcoming: upcomingBookings.length,
        past: pastBookings.length,
      },
    });
  } catch (error) {
    console.error("[Dashboard API] Error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data." },
      { status: 500 },
    );
  }
}
