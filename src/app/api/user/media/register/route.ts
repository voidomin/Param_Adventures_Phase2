import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);
    if (!payload)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const body = await request.json();
    const { url, type, hash } = body;

    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    // If hash provided, check for existing duplicate first
    if (hash) {
      const existing = await prisma.image.findFirst({
        where: { fileHash: hash },
        select: { id: true, originalUrl: true, type: true },
      });
      if (existing) {
        return NextResponse.json({ image: existing }, { status: 200 });
      }
    }

    const image = await prisma.image.create({
      data: {
        originalUrl: url,
        type: type === "VIDEO" ? "VIDEO" : "IMAGE",
        uploadedById: payload.userId,
        fileHash: hash || null,
      },
    });

    return NextResponse.json({ image }, { status: 201 });
  } catch (error: unknown) {
    console.error("Media register error:", error);
    return NextResponse.json(
      { error: "Failed to register media" },
      { status: 500 },
    );
  }
}
