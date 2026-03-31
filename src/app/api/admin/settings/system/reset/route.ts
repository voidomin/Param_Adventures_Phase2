import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeSystemRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { DEFAULT_PLATFORM_SETTINGS, DEFAULT_SITE_SETTINGS } from "@/lib/constants/settings";

/**
 * POST /api/admin/settings/system/reset
 * Wipes all current system configurations and restores hardcoded defaults.
 * Restricted to whitelisted Super Admins.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeSystemRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : "127.0.0.1";

    await prisma.$transaction(async (tx) => {
      // 1. Delete all current settings
      await tx.platformSetting.deleteMany({});
      await tx.siteSetting.deleteMany({});

      // 2. Insert Default Platform Settings
      for (const setting of DEFAULT_PLATFORM_SETTINGS) {
        await tx.platformSetting.create({ data: setting });
      }

      // 3. Insert Default Site Settings
      for (const setting of DEFAULT_SITE_SETTINGS) {
        await tx.siteSetting.create({ data: setting });
      }

      // 4. Log the reset action
      await logActivity(
        "SYSTEM_FACTORY_RESET",
        auth.userId,
        "SYSTEM",
        "ALL",
        { ip, message: "User triggered a full system configuration reset to defaults." },
        tx
      );
    });

    return NextResponse.json({ message: "System settings restored to defaults successfully." });
  } catch (error) {
    console.error("Reset system settings error:", error);
    return NextResponse.json(
      { error: "Failed to reset system settings." },
      { status: 500 },
    );
  }
}
