import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { z } from "zod";

const mediaRegisterSchema = z.object({
  url: z.string().refine(
    (val) => {
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "url must be a valid URL" },
  ),
  type: z.enum(["IMAGE", "VIDEO"]),
  hash: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await verifyAccessToken(token);
    if (!payload)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = mediaRegisterSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { url, type, hash } = parseResult.data;

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
