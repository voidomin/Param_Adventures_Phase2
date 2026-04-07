import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { authorizeSystemRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";

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

    return NextResponse.json({ platform, site });
  } catch (error) {
    console.error("Fetch system settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch system settings." },
      { status: 500 },
    );
  }
}

const PLATFORM_KEYS = new Set([
  "razorpay_mode", 
  "razorpay_key_id", 
  "razorpay_key_secret", 
  "razorpay_webhook_secret",
  "taxConfig",
  "companyName",
  "gstNumber",
  "panNumber",
  "stateCode",
  "companyAddress",
  "jwt_secret",
  "session_lifetime_hrs",
  "google_analytics_id",
  "google_analytics_enabled",
  "sentry_dsn",
  "sentry_enabled",
  "meta_pixel_id",
  "meta_pixel_enabled",
  "microsoft_clarity_id",
  "microsoft_clarity_enabled",
  "email_provider",
  "smtp_host",
  "smtp_port",
  "smtp_user",
  "smtp_pass",
  "smtp_secure",
  "smtp_from",
  "zoho_api_key",
  "resend_api_key"
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

    // Foolproof: If key is in PLATFORM_KEYS, always use PLATFORM regardless of 'type'
    const targetType = PLATFORM_KEYS.has(key) ? "PLATFORM" : type;
    const action = targetType === "PLATFORM" ? "UPDATE_PLATFORM_SETTING" : "UPDATE_SITE_SETTING";

    let oldSetting;
    if (targetType === "PLATFORM") {
      oldSetting = await tx.platformSetting.findUnique({ where: { key } });
      await tx.platformSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    } else {
      oldSetting = await tx.siteSetting.findUnique({ where: { key } });
      await tx.siteSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    if (oldSetting?.value !== String(value)) {
      const logMetadata: Record<string, unknown> = { 
        from: oldSetting?.value ?? null, 
        to: value, 
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
      // Process everything—the updateSettings function will now route correctly
      if (platform && Array.isArray(platform)) {
        await updateSettings(tx, auth.userId, "PLATFORM", platform, ip);
      }
      if (site && Array.isArray(site)) {
        await updateSettings(tx, auth.userId, "SITE", site, ip);
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
