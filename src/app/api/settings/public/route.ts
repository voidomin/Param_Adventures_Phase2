import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await Promise.all([
      prisma.siteSetting.findMany(),
      prisma.platformSetting.findMany(),
    ]);

    const keys = [
      "site_title",
      "support_email",
      "support_phone",
      "auth_login_bg",
      "auth_register_bg",
      "auth_common_tagline",
      "auth_login_image_heading",
      "auth_login_image_subheading",
      "auth_login_form_heading",
      "auth_login_form_subheading",
      "auth_register_image_heading",
      "auth_register_image_subheading",
      "auth_register_form_heading",
      "auth_register_form_subheading"
    ];

    const settingsData = await prisma.siteSetting.findMany({
      where: { key: { in: keys } }
    });

    const getVal = (key: string, fallback: string) => 
      settingsData.find(s => s.key === key)?.value || fallback;

    const [googleClientIdSetting, turnstileSiteKeySetting] = await Promise.all([
      prisma.platformSetting.findUnique({ where: { key: "google_client_id" } }),
      prisma.platformSetting.findUnique({ where: { key: "turnstile_site_key" } }),
    ]);

    const config = {
      site_title: getVal("site_title", "Param Adventures"),
      support_email: getVal("support_email", "info@paramadventures.in"),
      support_phone: getVal("support_phone", "+91 98765 43210"),
      maintenance_mode: (await prisma.platformSetting.findUnique({ where: { key: "maintenance_mode" } }))?.value === "true",
      taxConfig: (await prisma.platformSetting.findUnique({ where: { key: "taxConfig" } }))?.value ?? null,
      // Public by design (not secret) -- these are the client-side halves of
      // Google Sign-In / Turnstile, needed by browser buttons at runtime so
      // an admin can rotate them without a redeploy.
      google_client_id: googleClientIdSetting?.value || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      turnstile_site_key: turnstileSiteKeySetting?.value || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
      branding: {} as Record<string, string>
    };

    keys.forEach(k => {
      if (k.startsWith("auth_") || k.includes("site_title")) {
        config.branding[k] = getVal(k, "");
      }
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("Public settings fetch error:", error);
    return NextResponse.json({
      site_title: "Param Adventures",
      support_email: "info@paramadventures.in",
      support_phone: "+91 98765 43210",
      maintenance_mode: false,
      taxConfig: null,
      google_client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      turnstile_site_key: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
      branding: {
        site_title: "Param Adventures",
      },
    });
  }
}
