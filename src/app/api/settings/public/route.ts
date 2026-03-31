import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const [site, platform] = await Promise.all([
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

    const config = {
      site_title: getVal("site_title", "Param Adventures"),
      support_email: getVal("support_email", "info@paramadventures.in"),
      support_phone: getVal("support_phone", "+91 98765 43210"),
      maintenance_mode: (await prisma.platformSetting.findUnique({ where: { key: "maintenance_mode" } }))?.value === "true",
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
    return NextResponse.json(
      { error: "Failed to fetch settings." },
      { status: 500 },
    );
  }
}
