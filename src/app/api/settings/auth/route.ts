import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public GET /api/settings/auth
// Returns all auth-related text settings in a single request
export async function GET() {
  try {
    const keys = [
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

    const settings = await prisma.siteSetting.findMany({
      where: { key: { in: keys } }
    });

    // Map to an object for easier frontend consumption
    const config: Record<string, string> = {};
    settings.forEach((s: { key: string; value: string }) => {
      config[s.key] = s.value;
    });

    return NextResponse.json(
      {
        settings: config,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      },
    );
  } catch (error: unknown) {
    console.error("Auth settings fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch auth settings" },
      { status: 500 }
    );
  }
}
