import { NextResponse, NextRequest } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const SENSITIVE_KEYS = new Set([
  "jwt_secret",
  "razorpay_key_secret",
  "razorpay_webhook_secret",
  "smtp_pass",
  "zoho_api_key",
  "resend_api_key",
  "aws_secret_access_key"
]);

const MASK_VALUE = "[UNREVEALED]";

// GET /api/admin/settings
export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeRequest(request, ["system:config"]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const key = request.nextUrl.searchParams.get("key");

    if (key) {
      const siteSetting = await prisma.siteSetting.findUnique({ where: { key } });
      if (siteSetting) return NextResponse.json({ setting: siteSetting });
      
      const platformSetting = await prisma.platformSetting.findUnique({ where: { key } });
      return NextResponse.json({ setting: platformSetting });
    }

    // Return all site settings + specific platform settings allowed for the dashboard
    const platformKeys = [
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
    ];
    const platformSettings = await prisma.platformSetting.findMany({
      where: { key: { in: platformKeys } }
    });

    const relevantSiteSettings = await prisma.siteSetting.findMany({
      where: { key: { in: platformKeys } }
    });

    // Merge: platformSettings take priority, siteSettings are the fallback
    const merged: Record<string, string> = {};
    
    // First, map all standard site settings (non-platform)
    const allSiteSettings = await prisma.siteSetting.findMany();
    allSiteSettings.forEach(s => merged[s.key] = s.value);

    // Then, merge platform settings and their fallbacks
    relevantSiteSettings.forEach(s => merged[s.key] = s.value);
    platformSettings.forEach(s => merged[s.key] = s.value);

    // Mask sensitive values before returning to client
    Object.keys(merged).forEach(k => {
      if (SENSITIVE_KEYS.has(k) && merged[k]) {
        merged[k] = MASK_VALUE;
      }
    });

    return NextResponse.json({ settings: merged });
  } catch (error: unknown) {
    console.error("Fetch settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

// PUT /api/admin/settings — Bulk update settings
export async function PUT(request: NextRequest) {
  try {
    const auth = await authorizeRequest(request, ["system:config"]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const settings = body.settings; // Frontend sends { settings: { ... } }

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Invalid settings format" }, { status: 400 });
    }

    const platformKeys = new Set([
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

    // Transactionally update all settings, filtering out masked placeholders
    await prisma.$transaction(
      Object.entries(settings)
        .filter(([key, value]) => {
          // If it's a sensitive key and the value is the masking placeholder, skip the update
          if (SENSITIVE_KEYS.has(key) && value === MASK_VALUE) {
            return false;
          }
          return true;
        })
        .map(([key, value]) => {
          if (platformKeys.has(key)) {
            return prisma.platformSetting.upsert({
              where: { key },
              update: { value: String(value) },
              create: { key, value: String(value) }
            });
          }
          return prisma.siteSetting.upsert({
            where: { key },
            update: { value: String(value) },
            create: { key, value: String(value) }
          });
        })
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/settings?key=auth_login_bg
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authorizeRequest(request, ["system:config"]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const key = request.nextUrl.searchParams.get("key");
    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    await prisma.siteSetting.deleteMany({ where: { key } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete setting error:", error);
    return NextResponse.json(
      { error: "Failed to delete setting" },
      { status: 500 },
    );
  }
}
