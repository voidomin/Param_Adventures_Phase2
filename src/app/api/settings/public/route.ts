import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const [site, platform] = await Promise.all([
      prisma.siteSetting.findMany(),
      prisma.platformSetting.findMany(),
    ]);

    const getVal = (arr: any[], key: string, fallback: string) => arr.find(s => s.key === key)?.value || fallback;

    const settings = {
      site_title: getVal(site, "site_title", "Param Adventures"),
      support_email: getVal(site, "support_email", "info@paramadventures.in"),
      support_phone: getVal(site, "support_phone", "+91 98765 43210"),
      maintenance_mode: getVal(platform, "maintenance_mode", "false") === "true",
    };

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Public settings fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings." },
      { status: 500 },
    );
  }
}
