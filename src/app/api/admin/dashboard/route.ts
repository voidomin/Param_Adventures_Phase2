import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

// GET /api/admin/dashboard — SUPER_ADMIN only
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  if (auth.roleName !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Unauthorized access: SUPER_ADMIN only." },
      { status: 403 },
    );
  }

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [revenueAgg, recentBookings, upcomingTripsCount] = await Promise.all([
      prisma.booking.aggregate({
        where: {
          bookingStatus: "CONFIRMED",
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { totalPrice: true },
      }),
      prisma.booking.count({
        where: {
          bookingStatus: "CONFIRMED",
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.slot.count({
        where: {
          date: { gte: now },
        },
      }),
    ]);

    const [pendingBlogs, pendingBookings] = await Promise.all([
      prisma.blog.count({
        where: { status: "PENDING_REVIEW" },
      }),
      prisma.booking.count({
        where: { bookingStatus: "REQUESTED" },
      }),
    ]);

    // Fetch only the 5 most recent activity entries for a quick preview
    const recentActivity = await prisma.auditLog.findMany({
      take: 5,
      orderBy: { timestamp: "desc" },
    });

    return NextResponse.json({
      metrics: {
        totalRevenue30d: Number(revenueAgg._sum.totalPrice || 0),
        activeBookings30d: recentBookings,
        upcomingTrips: upcomingTripsCount,
      },
      pendingActions: {
        blogs: pendingBlogs,
        bookings: pendingBookings,
      },
      recentActivity,
    });
  } catch (error) {
    console.error("Admin dashboard fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin dashboard data." },
      { status: 500 },
    );
  }
}
