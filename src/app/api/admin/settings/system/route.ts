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

async function updateSettings(
  tx: Prisma.TransactionClient,
  userId: string,
  type: "PLATFORM" | "SITE",
  settings: { key: string; value: string }[],
  ip: string
) {
  const model = type === "PLATFORM" ? tx.platformSetting : tx.siteSetting;
  const action = type === "PLATFORM" ? "UPDATE_PLATFORM_SETTING" : "UPDATE_SITE_SETTING";

  for (const { key, value } of settings) {
    if (!key) continue;

    const oldSetting = await model.findUnique({ where: { key } });
    
    await model.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    if (oldSetting?.value !== value) {
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
