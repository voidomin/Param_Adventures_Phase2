import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

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
    const { url, type } = await request.json();

    if (!url || !type) {
      return NextResponse.json(
        { error: "Missing url or type" },
        { status: 400 },
      );
    }

    // Save to Database
    const media = await prisma.image.create({
      data: {
        originalUrl: url,
        type: type === "VIDEO" ? "VIDEO" : "IMAGE",
        uploadedById: auth.userId,
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
