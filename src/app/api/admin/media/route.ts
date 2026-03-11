import { NextResponse, NextRequest } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeRequest(request, [
      "trip:create",
      "system:config",
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch images uploaded by administrative roles only
    const images = await prisma.image.findMany({
      where: {
        uploadedBy: {
          role: {
            name: {
              in: ["SUPER_ADMIN", "ADMIN", "TRIP_MANAGER"],
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        uploadedBy: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({ images });
  } catch (error: unknown) {
    console.error("Fetch media error:", error);
    return NextResponse.json(
      { error: "Failed to fetch media library" },
      { status: 500 },
    );
  }
}

import { z } from "zod";

const mediaCreateSchema = z.object({
  originalUrl: z.string().refine(
    (val) => {
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "originalUrl must be a valid URL" },
  ),
  type: z.enum(["IMAGE", "VIDEO"]).optional().default("IMAGE"),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeRequest(request, [
      "trip:create",
      "system:config",
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = mediaCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { originalUrl, type } = parseResult.data;

    const image = await prisma.image.create({
      data: {
        originalUrl,
        type,
        uploadedById: auth.userId,
      },
    });

    return NextResponse.json(image, { status: 201 });
  } catch (error: unknown) {
    console.error("Save media error:", error);
    return NextResponse.json(
      { error: "Failed to save media record" },
      { status: 500 },
    );
  }
}
