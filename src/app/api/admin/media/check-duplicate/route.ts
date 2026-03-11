import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

import { z } from "zod";

const duplicateCheckSchema = z.object({
  hash: z.string().min(1, "hash is required"),
});

/**
 * POST /api/admin/media/check-duplicate
 * Checks if a file with the given SHA-256 hash already exists.
 * Returns the existing URL if found, avoiding a redundant upload.
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
    const parseResult = duplicateCheckSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { hash } = parseResult.data;

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
