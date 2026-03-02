import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { generatePresignedUrl } from "@/lib/s3";

/**
 * POST /api/user/avatar/presign — Generate a presigned URL for avatar upload
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
    const { fileName, contentType } = await request.json();
    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "Missing fileName or contentType" },
        { status: 400 },
      );
    }

    const safeFileName = `avatars/${payload.userId}-${Date.now()}-${fileName.replaceAll(/\s+/g, "_")}`;
    const { uploadUrl, finalUrl } = await generatePresignedUrl(
      safeFileName,
      contentType,
    );

    return NextResponse.json({ uploadUrl, finalUrl });
  } catch (error) {
    console.error("[Avatar Presign] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/user/avatar — Save the avatarUrl to the user record
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
