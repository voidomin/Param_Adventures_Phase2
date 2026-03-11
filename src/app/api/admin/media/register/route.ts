import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

import { z } from "zod";

const mediaRegisterSchema = z.object({
  url: z.string().refine((val) => {
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, { message: "url must be a valid URL" }),
  type: z.enum(["IMAGE", "VIDEO"]),
  hash: z.string().optional().nullable(),
});

/**
 * POST /api/admin/media/register
 * Used to save media metadata (URL, type) after a direct browser-to-cloud upload.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, [
    "trip:create",
    "system:config",
  ]);
  if (!auth.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
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
        return NextResponse.json({
          id: existing.id,
          url: existing.originalUrl,
          type: existing.type,
        });
      }
    }

    // Save to Database
    const media = await prisma.image.create({
      data: {
        originalUrl: url,
        type: type === "VIDEO" ? "VIDEO" : "IMAGE",
        uploadedById: auth.userId,
        fileHash: hash || null,
      },
    });

    return NextResponse.json({
      id: media.id,
      url: media.originalUrl,
      type: media.type,
    });
  } catch (error) {
    console.error("Media registration error:", error);
    return NextResponse.json(
      { error: "Failed to register media. Please try again." },
      { status: 500 },
    );
  }
}
