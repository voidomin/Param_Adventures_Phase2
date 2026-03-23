import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public GET /api/settings?key=auth_login_bg
// Returns a single setting by key (no auth required)
export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "key query parameter is required" },
        { status: 400 },
      );
    }

    const setting = await prisma.siteSetting.findUnique({ where: { key } });

    return NextResponse.json(
      {
        value: setting?.value ?? null,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      },
    );
  } catch (error: unknown) {
    console.error("Public settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch setting" },
      { status: 500 },
    );
  }
}
