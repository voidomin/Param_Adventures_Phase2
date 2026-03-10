import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";

/**
 * POST /api/user/media/check-duplicate
 * Checks if a file with the given SHA-256 hash already exists.
 * Returns the existing URL if found, avoiding a redundant upload.
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);
    if (!payload)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { hash } = await request.json();

    if (!hash || typeof hash !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid hash" },
        { status: 400 },
      );
    }

    const existing = await prisma.image.findFirst({
      where: { fileHash: hash },
      select: { id: true, originalUrl: true, type: true },
    });

    if (existing) {
      return NextResponse.json({
        exists: true,
        id: existing.id,
        url: existing.originalUrl,
        type: existing.type,
      });
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error("Duplicate check error:", error);
    return NextResponse.json(
      { error: "Duplicate check failed" },
      { status: 500 },
    );
  }
}
