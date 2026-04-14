import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeSystemRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";

// Redaction strategy for platform settings
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
  // Surgical stripping: completely remove sensitive keys from the export payload
  return settings.filter(s => !SENSITIVE_KEYS.has(s.key));
};

// Rate limit: 60 seconds cooldown for data exports
let lastExportTime = 0;
const COOLDOWN_MS = 60 * 1000;

/**
 * GET /api/admin/settings/system/database/snapshot
 * Exports critical platform data as a secure JSON archive.
 * Implements architectural hardening: Deny-by-Default selectors and Rate Limiting.
 */
export async function GET(request: NextRequest) {
  // 1. High-Security Auth Check (Whitelist + SuperAdmin)
  const auth = await authorizeSystemRequest(request);
  if (!auth.authorized) return auth.response;

  // 2. Rate Limiting (Memory-based Cooldown)
  const now = Date.now();
  if (now - lastExportTime < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - (now - lastExportTime)) / 1000);
    return NextResponse.json(
      { error: `Export cooldown active. Please wait ${remaining}s before generating a new snapshot.` },
      { status: 429 }
    );
  }

  try {
    const timestamp = new Date().toISOString();
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    
    // 3. Selective Fetching (Deny-by-Default)
    // We explicitly exclude hashes, secrets, and auth tokens from the export.
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
      prisma.user.findMany({ 
        select: { 
          id: true, email: true, name: true, roleId: true, status: true, 
          phoneNumber: true, age: true, gender: true, createdAt: true 
          // password, googleId, resetToken, tokenVersion EXCLUDED
        } 
      }),
      prisma.role.findMany({ include: { permissions: { include: { permission: true } } } }),
      prisma.experience.findMany(),
      prisma.category.findMany(),
      prisma.slot.findMany({ include: { assignments: true } }),
      prisma.booking.findMany({ include: { participants: true, payments: true } }),
      prisma.payment.findMany({
        select: {
          id: true, bookingId: true, provider: true, amount: true, 
          currency: true, status: true, createdAt: true
          // providerPaymentId, fullPayload EXCLUDED
        }
      }),
      prisma.platformSetting.findMany(),
      prisma.siteSetting.findMany(),
    ]);

    const snapshot = {
      version: "2.1.0",
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

    // 4. Enriched Audit Logging
    await logActivity(
      "DATABASE_SNAPSHOT_EXPORTED",
      auth.userId,
      "SYSTEM",
      "ALL",
      { 
        ip,
        snapshot_version: "2.1.0",
        record_counts: {
          users: users.length,
          bookings: bookings.length,
          payments: payments.length
        }
      }
    );

    lastExportTime = now;

    // 5. Return as a downloadable JSON file
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
