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

    // Fetch images descending by creation date
    const images = await prisma.image.findMany({
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
    const { originalUrl, type = "IMAGE" } = body;

    if (!originalUrl) {
      return NextResponse.json(
        { error: "Missing originalUrl required field" },
        { status: 400 },
      );
    }

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
