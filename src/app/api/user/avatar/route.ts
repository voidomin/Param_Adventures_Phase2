import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { z } from "zod";

/**
 * POST /api/user/avatar — Upload avatar directly to Cloudinary
 * Accepts multipart/form-data with a "file" field.
 */
export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = await verifyAccessToken(accessToken);
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

    revalidatePath("/", "layout");

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

const avatarPatchSchema = z.object({
  avatarUrl: z.string().refine((val) => {
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, { message: "Invalid avatar URL" }),
});

/**
 * PATCH /api/user/avatar — Save a pre-existing avatarUrl to the user record
 */
export async function PATCH(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = await verifyAccessToken(accessToken);
  if (!payload) {
    return NextResponse.json({ error: "Invalid token." }, { status: 401 });
  }

  try {
    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = avatarPatchSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { avatarUrl } = parseResult.data;

    const updated = await prisma.user.update({
      where: { id: payload.userId },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true },
    });

    revalidatePath("/", "layout");

    return NextResponse.json({ success: true, avatarUrl: updated.avatarUrl });
  } catch (error) {
    console.error("[Avatar PATCH] Error:", error);
    return NextResponse.json(
      { error: "Failed to update avatar." },
      { status: 500 },
    );
  }
}
