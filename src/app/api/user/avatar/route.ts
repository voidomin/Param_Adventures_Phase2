import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";

/**
 * POST /api/user/avatar — Upload avatar directly to Cloudinary
 * Accepts multipart/form-data with a "file" field.
 */
export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyAccessToken(accessToken);
  if (!payload) {
    return NextResponse.json({ error: "Invalid token." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed for avatars." },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadToCloudinary(buffer, {
      folder: "param-adventures/avatars",
      resource_type: "image",
      public_id: `avatar-${payload.userId}`, // Overwrite on re-upload
    });

    // Save the new avatar URL on the user record
    const updated = await prisma.user.update({
      where: { id: payload.userId },
      data: { avatarUrl: result.secure_url },
      select: { id: true, avatarUrl: true },
    });

    return NextResponse.json({
      success: true,
      avatarUrl: updated.avatarUrl,
    });
  } catch (error) {
    console.error("[Avatar Upload] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload avatar." },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/user/avatar — Save a pre-existing avatarUrl to the user record
 */
export async function PATCH(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyAccessToken(accessToken);
  if (!payload) {
    return NextResponse.json({ error: "Invalid token." }, { status: 401 });
  }

  try {
    const { avatarUrl } = await request.json();
    if (!avatarUrl || typeof avatarUrl !== "string") {
      return NextResponse.json({ error: "Missing avatarUrl" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: payload.userId },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true },
    });

    return NextResponse.json({ success: true, avatarUrl: updated.avatarUrl });
  } catch (error) {
    console.error("[Avatar PATCH] Error:", error);
    return NextResponse.json(
      { error: "Failed to update avatar." },
      { status: 500 },
    );
  }
}
