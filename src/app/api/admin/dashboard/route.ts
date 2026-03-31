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

    // ─── Core Metrics ─────────────────────────────────────
    const [revenueAgg, recentBookingsCount, upcomingTripsCount] =
      await Promise.all([
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
          where: { date: { gte: now } },
        }),
      ]);

    // ─── Pending Actions ──────────────────────────────────
    const [pendingBlogs, pendingBookings, pendingLeads] = await Promise.all([
      prisma.blog.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.booking.count({ where: { bookingStatus: "REQUESTED" } }),
      prisma.customLead.count({ where: { status: "NEW" } }),
    ]);

    // ─── Recent Activity ──────────────────────────────────
    const recentActivity = await prisma.auditLog.findMany({
      take: 5,
      orderBy: { timestamp: "desc" },
    });

    // ─── Revenue by Month (last 6 months) ─────────────────
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const confirmedBookings = await prisma.booking.findMany({
      where: {
        bookingStatus: "CONFIRMED",
        createdAt: { gte: sixMonthsAgo },
      },
      select: { totalPrice: true, createdAt: true },
    });

    const revenueByMonth: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString("en-IN", {
        month: "short",
        year: "2-digit",
      });
      const year = d.getFullYear();
      const month = d.getMonth();

      const monthRevenue = confirmedBookings
        .filter((b) => {
          const bd = new Date(b.createdAt);
          return bd.getFullYear() === year && bd.getMonth() === month;
        })
        .reduce((sum, b) => sum + Number(b.totalPrice), 0);

      revenueByMonth.push({ month: label, revenue: monthRevenue });
    }

    // ─── Bookings by Status ───────────────────────────────
    const [requestedCount, confirmedCount, cancelledCount] = await Promise.all([
      prisma.booking.count({ where: { bookingStatus: "REQUESTED" } }),
      prisma.booking.count({ where: { bookingStatus: "CONFIRMED" } }),
      prisma.booking.count({ where: { bookingStatus: "CANCELLED" } }),
    ]);

    const bookingsByStatus = [
      { status: "Requested", count: requestedCount, color: "#f59e0b" },
      { status: "Confirmed", count: confirmedCount, color: "#22c55e" },
      { status: "Cancelled", count: cancelledCount, color: "#ef4444" },
    ];

    // ─── Top Experiences by Bookings ──────────────────────
    const topExperiencesRaw = await prisma.experience.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        _count: { select: { bookings: true } },
      },
      orderBy: { bookings: { _count: "desc" } },
      take: 5,
    });

    const topExperiences = topExperiencesRaw.map((e) => ({
      name: e.title.length > 25 ? e.title.slice(0, 25) + "…" : e.title,
      bookings: e._count.bookings,
    }));

    // ─── User Growth (last 6 months) ─────────────────────
    const allRecentUsers = await prisma.user.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    });

    const userGrowth: { month: string; users: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString("en-IN", {
        month: "short",
        year: "2-digit",
      });
      const year = d.getFullYear();
      const month = d.getMonth();

      const count = allRecentUsers.filter((u) => {
        const ud = new Date(u.createdAt);
        return ud.getFullYear() === year && ud.getMonth() === month;
      }).length;

      userGrowth.push({ month: label, users: count });
    }

    // ─── Total users count ────────────────────────────────
    const totalUsers = await prisma.user.count();
    const totalExperiences = await prisma.experience.count({
      where: { status: "PUBLISHED" },
    });
    const totalReviews = await prisma.experienceReview.count();
    const totalSaves = await prisma.savedExperience.count();

    return NextResponse.json({
      metrics: {
        totalRevenue30d: Number(revenueAgg._sum.totalPrice || 0),
        activeBookings30d: recentBookingsCount,
        upcomingTrips: upcomingTripsCount,
        totalUsers,
        totalExperiences,
        totalReviews,
        totalSaves,
      },
      pendingActions: {
        blogs: pendingBlogs,
        bookings: pendingBookings,
        leads: pendingLeads,
      },
      recentActivity,
      charts: {
        revenueByMonth,
        bookingsByStatus,
        topExperiences,
        userGrowth,
      },
    });
  } catch (error) {
    console.error("Admin dashboard fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin dashboard data." },
      { status: 500 },
    );
  }
}
