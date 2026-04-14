import { NextResponse, NextRequest } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { SettingsService } from "@/services/settings.service";

/**
 * GET /api/admin/settings - Fetch merged and masked settings
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeRequest(request, ["system:config"]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const merged = await SettingsService.getMergedSettings();
    return NextResponse.json({ settings: merged });

  } catch (error: unknown) {
    console.error("Fetch settings error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/settings - Bulk update settings
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await authorizeRequest(request, ["system:config"]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const settings = body.settings;

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Invalid settings format" }, { status: 400 });
    }

    await SettingsService.updateSettings(settings);
    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/settings?key=XYZ
 */
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

    await SettingsService.deleteSetting(key);
    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    console.error("Delete setting error:", error);
    return NextResponse.json({ error: "Failed to delete setting" }, { status: 500 });
  }
}
