import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { authorizeSystemRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/settings/system
 * Fetches all platform and site-level configuration.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeSystemRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const [platform, site] = await Promise.all([
      prisma.platformSetting.findMany({ orderBy: { key: "asc" } }),
      prisma.siteSetting.findMany({ orderBy: { key: "asc" } }),
    ]);

    const platformKeysFound = new Set(platform.map(p => p.key));
    const cleanSite = site.filter(s => !PLATFORM_KEYS.has(s.key) && !platformKeysFound.has(s.key));

    return NextResponse.json({ platform, site: cleanSite });
  } catch (error) {
    console.error("Fetch system settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch system settings." },
      { status: 500 },
    );
  }
}

const PLATFORM_KEYS = new Set([
  // Payment Gateways
  "razorpay_mode", 
  "razorpay_key_id", 
  "razorpay_key_secret", 
  "razorpay_webhook_secret",

  // Finance & Taxation
  "taxConfig",
  "companyName",
  "gstNumber",
  "panNumber",
  "stateCode",
  "companyAddress",
  "companyPhone",
  "companyEmail",

  // Auth & Security
  "jwt_secret",
  "session_lifetime_hrs",

  // Analytics & Monitoring
  "google_analytics_id",
  "google_analytics_enabled",
  "sentry_dsn",
  "sentry_enabled",
  "meta_pixel_id",
  "meta_pixel_enabled",
  "microsoft_clarity_id",
  "microsoft_clarity_enabled",

  // Email Configuration
  "email_provider",
  "smtp_host",
  "smtp_port",
  "smtp_user",
  "smtp_pass",
  "smtp_secure",
  "smtp_from",
  "zoho_api_key",
  "zoho_org_id",
  "resend_api_key",

  // Media & Storage
  "media_provider",
  "cdn_url",
  "s3_bucket",
  "s3_region",
  "s3_access_key",
  "s3_secret_key",
  "s3_endpoint",
  "cloudinary_cloud_name",
  "cloudinary_api_key",
  "cloudinary_api_secret",

  // Core Platform
  "app_url"
]);

async function updateSettings(
  tx: Prisma.TransactionClient,
  userId: string,
  type: "PLATFORM" | "SITE",
  settings: { key: string; value: string }[],
  ip: string
) {
  for (const { key, value } of settings) {
    if (!key) continue;

    let processedValue = String(value).trim();
    
    // Statutory Formatting
    if (key === "gstNumber" || key === "panNumber") {
      processedValue = processedValue.toUpperCase();
    }

    // Foolproof: If key is in PLATFORM_KEYS, always use PLATFORM regardless of 'type'
    const targetType = PLATFORM_KEYS.has(key) ? "PLATFORM" : type;
    const action = targetType === "PLATFORM" ? "UPDATE_PLATFORM_SETTING" : "UPDATE_SITE_SETTING";

    let oldSetting;
    if (targetType === "PLATFORM") {
      oldSetting = await tx.platformSetting.findUnique({ where: { key } });
      await tx.platformSetting.upsert({
        where: { key },
        update: { value: processedValue },
        create: { key, value: processedValue },
      });
      // Cleanup: Ensure statutory settings don't exist in SiteSetting to prevent conflicts
      await tx.siteSetting.deleteMany({ where: { key } });
    } else {
      oldSetting = await tx.siteSetting.findUnique({ where: { key } });
      await tx.siteSetting.upsert({
        where: { key },
        update: { value: processedValue },
        create: { key, value: processedValue },
      });
    }

    if (oldSetting?.value !== processedValue) {
      const logMetadata: Record<string, unknown> = { 
        from: oldSetting?.value ?? null, 
        to: processedValue, 
        ip 
      };
      await logActivity(
        action,
        userId,
        "SYSTEM",
        key,
        logMetadata,
        tx
      );
    }
  }
}

/**
 * PATCH /api/admin/settings/system
 * Updates specific platform or site settings.
 */
export async function PATCH(request: NextRequest) {
  const auth = await authorizeSystemRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const { platform, site } = await request.json();
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : "127.0.0.1";

    await prisma.$transaction(async (tx) => {
      // Order matters: Process site first, then platform.
      // If a key exists in both (due to legacy data), the platform array value
      // will correctly override and become the final state.
      if (site && Array.isArray(site)) {
        await updateSettings(tx, auth.userId, "SITE", site, ip);
      }
      if (platform && Array.isArray(platform)) {
        await updateSettings(tx, auth.userId, "PLATFORM", platform, ip);
      }
    });

    return NextResponse.json({ message: "System settings updated successfully." });
  } catch (error) {
    console.error("Update system settings error:", error);
    return NextResponse.json(
      { error: "Failed to update system settings." },
      { status: 500 },
    );
  }
}
