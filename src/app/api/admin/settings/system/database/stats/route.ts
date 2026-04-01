import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeSystemRequest } from "@/lib/api-auth";

/**
 * GET /api/admin/settings/system/database/stats
 * Provides platform-wide health metrics and row counts.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeSystemRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    // 1. Fetch row counts for critical tables
    const [
      userCount,
      bookingCount,
      experienceCount,
      paymentCount,
      auditCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.booking.count(),
      prisma.experience.count(),
      prisma.payment.count(),
      prisma.auditLog.count(),
    ]);

    // 2. Simple connection test
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "HEALTHY",
      diskUsage: "N/A (Managed)", // Render doesn't expose this via Prisma easily
      stats: {
        users: userCount,
        bookings: bookingCount,
        experiences: experienceCount,
        payments: paymentCount,
        auditLogs: auditCount,
      },
      lastBackup: "Check Audit Logs", // We can improve this later
    });
  } catch (error) {
    console.error("Database stats error:", error);
    return NextResponse.json(
      { 
        status: "UNHEALTHY", 
        error: "Failed to retrieve database metrics." 
      },
      { status: 500 },
    );
  }
}
