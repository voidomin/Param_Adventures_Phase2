import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/db";
import { createHash } from "crypto";

/**
 * POST /api/admin/media/upload
 * Accepts multipart/form-data with a "file" field.
 * Computes SHA-256 hash for dedup, uploads to Cloudinary, and saves to DB.
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
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Only images and videos are supported." },
        { status: 400 },
      );
    }

    // Convert File → Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Compute SHA-256 hash for dedup
    const fileHash = createHash("sha256").update(buffer).digest("hex");

    // Check for existing file with same hash
    const existing = await prisma.image.findFirst({
      where: { fileHash },
      select: { id: true, originalUrl: true, type: true },
    });

    if (existing) {
      return NextResponse.json({
        id: existing.id,
        url: existing.originalUrl,
        type: existing.type,
        deduplicated: true,
      });
    }

    // Upload to Cloudinary
    const folder = isVideo
      ? "param-adventures/videos"
      : "param-adventures/images";
    const result = await uploadToCloudinary(buffer, {
      folder,
      resource_type: isVideo ? "video" : "image",
    });

    // Save to Image table with hash
    const image = await prisma.image.create({
      data: {
        originalUrl: result.secure_url,
        type: isVideo ? "VIDEO" : "IMAGE",
        uploadedById: auth.userId,
        fileHash,
      },
    });

    return NextResponse.json({
      id: image.id,
      url: result.secure_url,
      type: image.type,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error("Media upload error:", error);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}
