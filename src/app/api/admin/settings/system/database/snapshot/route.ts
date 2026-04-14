import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeSystemRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";

const SENSITIVE_KEYS = new Set([
  "jwt_secret",
  "razorpay_key_secret",
  "razorpay_webhook_secret",
  "smtp_pass",
  "zoho_api_key",
  "resend_api_key",
  "aws_secret_access_key"
]);

const sanitizeSettings = (settings: { key: string; value: string }[]) => {
  return settings.map(s => ({
    ...s,
    value: SENSITIVE_KEYS.has(s.key) ? "[REDACTED]" : s.value
  }));
};

/**
 * GET /api/admin/settings/system/database/snapshot
 * Exports all critical platform data as a secure JSON archive.
 * Provides Data Sovereignty for the Product Owner.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeSystemRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const timestamp = new Date().toISOString();
    
    // 1. Fetch all critical data collections
    const [
      users, 
      roles, 
      experiences, 
      categories, 
      slots, 
      bookings, 
      payments, 
      platformSettings, 
      siteSettings
    ] = await Promise.all([
      prisma.user.findMany({ select: { id: true, email: true, name: true, roleId: true, status: true, phoneNumber: true, createdAt: true } }),
      prisma.role.findMany({ include: { permissions: { include: { permission: true } } } }),
      prisma.experience.findMany(),
      prisma.category.findMany(),
      prisma.slot.findMany({ include: { assignments: true } }),
      prisma.booking.findMany({ include: { participants: true, payments: true } }),
      prisma.payment.findMany(),
      prisma.platformSetting.findMany(),
      prisma.siteSetting.findMany(),
    ]);

    const snapshot = {
      version: "2.0.0",
      timestamp,
      environment: process.env.NODE_ENV,
      data: {
        users,
        roles,
        experiences,
        categories,
        slots,
        bookings,
        payments,
        platformSettings: sanitizeSettings(platformSettings),
        siteSettings: sanitizeSettings(siteSettings)
      }
    };

    // 2. Audit Log the export
    await logActivity(
      "DATABASE_SNAPSHOT_EXPORTED",
      auth.userId,
      "SYSTEM",
      "ALL",
      { message: `Full platform snapshot generated with ${bookings.length} bookings and ${users.length} users.` }
    );

    // 3. Return as a downloadable JSON file
    const response = NextResponse.json(snapshot);
    const filename = `param_adventures_snapshot_${timestamp.replaceAll(":", "-").replaceAll(".", "-")}.json`;
    
    response.headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    return response;

  } catch (error) {
    console.error("Snapshot generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate database snapshot." },
      { status: 500 },
    );
  }
}
