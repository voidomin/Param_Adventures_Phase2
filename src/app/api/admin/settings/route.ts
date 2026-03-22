import { NextResponse, NextRequest } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

// GET /api/admin/settings?key=auth_login_bg
export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeRequest(request, ["system:config"]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const key = request.nextUrl.searchParams.get("key");

    if (key) {
      const setting = await prisma.siteSetting.findUnique({ where: { key } });
      return NextResponse.json({ setting });
    }

    // Return all settings if no key specified
    const settings = await prisma.siteSetting.findMany();
    return NextResponse.json({ settings });
  } catch (error: unknown) {
    console.error("Fetch settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

const settingSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

// PUT /api/admin/settings — upsert a setting
export async function PUT(request: NextRequest) {
  try {
    const auth = await authorizeRequest(request, ["system:config"]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const parseResult = settingSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }

    const { key, value } = parseResult.data;

    const setting = await prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return NextResponse.json({ setting });
  } catch (error: unknown) {
    console.error("Update setting error:", error);
    return NextResponse.json(
      { error: "Failed to update setting" },
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
