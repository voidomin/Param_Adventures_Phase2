import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

/**
 * GET /api/admin/settings
 * Fetch all platform settings. Defaults are provided if missing.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "ops:view-all-trips"); // Basic admin check
  if (!auth.authorized) return auth.response;

  try {
    const settings = await prisma.platformSetting.findMany();
    
    // Convert to a neat object
    const map = settings.reduce((acc: Record<string, any>, current: any) => {
      try {
         // Attempt to parse JSON objects (like taxConfig)
         acc[current.key] = JSON.parse(current.value);
      } catch (e) {
         // Fallback to string
         acc[current.key] = current.value;
      }
      return acc;
    }, {});

    return NextResponse.json({ settings: map });
  } catch (error) {
    console.error("Fetch settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch platform settings." },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/settings
 * Update one or more platform settings
 */
export async function PUT(request: NextRequest) {
  const auth = await authorizeRequest(request, "trip:create"); // Super admin/Manager check
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { settings } = body; // Array of {key, value, description} or Record<string, string>

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Invalid settings payload" }, { status: 400 });
    }

    // Process as Key-Value object
    const promises = Object.entries(settings).map(([key, value]) => {
      return prisma.platformSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: {
          key,
          value: String(value),
          description: `Platform setting: ${key}`,
        },
      });
    });

    await Promise.all(promises);

    return NextResponse.json({ message: "Settings updated successfully." });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "Failed to update platform settings." },
      { status: 500 },
    );
  }
}
