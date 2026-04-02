import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeSystemRequest } from "@/lib/api-auth";

/**
 * Extracts the host from a DATABASE_URL for display purposes.
 * e.g. "postgresql://user:pass@host.render.com:5432/db" → "host.render.com"
 */
function extractDbInfo(): { host: string; region: string } {
  try {
    const raw = process.env.DATABASE_URL || "";
    const url = new URL(raw);
    const host = url.hostname || "localhost";

    // Infer region from common cloud DB host patterns
    let region = "Local";
    if (host.includes("render.com")) region = "Render (Managed)";
    else if (host.includes("ap-south")) region = "Mumbai (ap-south-1)";
    else if (host.includes("us-east")) region = "N. Virginia (us-east-1)";
    else if (host.includes("eu-west")) region = "Ireland (eu-west-1)";
    else if (host.includes("supabase")) region = "Supabase (Managed)";
    else if (host.includes("neon")) region = "Neon (Managed)";
    else if (host !== "localhost") region = host;

    return { host, region };
  } catch {
    return { host: "unknown", region: "Unknown" };
  }
}

/**
 * GET /api/admin/settings/system/database/stats
 * Provides platform-wide health metrics, row counts, and connection info.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeSystemRequest(request);
  if (!auth.authorized) return auth.response;

  try {
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

    // Connection test
    await prisma.$queryRaw`SELECT 1`;

    const { host, region } = extractDbInfo();

    return NextResponse.json({
      status: "HEALTHY",
      connection: { host, region },
      stats: {
        users: userCount,
        bookings: bookingCount,
        experiences: experienceCount,
        payments: paymentCount,
        auditLogs: auditCount,
      },
    });
  } catch (error) {
    console.error("Database stats error:", error);
    return NextResponse.json(
      { 
        status: "UNHEALTHY", 
        connection: { host: "unreachable", region: "Unknown" },
        error: "Failed to retrieve database metrics." 
      },
      { status: 500 },
    );
  }
}
