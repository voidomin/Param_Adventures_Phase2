import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth";
import { generatePresignedUrl } from "@/lib/s3";

/**
 * POST /api/user/media/presign
 * Allows any authenticated user to request a presigned upload URL or Cloudinary signature.
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { fileName, contentType } = body;

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "Missing fileName or contentType" },
        { status: 400 },
      );
    }

    // Priority 1: Cloudinary (Direct Upload)
    if (process.env.CLOUDINARY_API_KEY) {
      const { generateCloudinarySignature } = await import("@/lib/cloudinary");
      const cloudData = await generateCloudinarySignature(
        "param-adventures/users",
      );
      return NextResponse.json({ provider: "cloudinary", ...cloudData });
    }

    // Priority 2: AWS S3 (Direct Upload/Mock)
    const { uploadUrl, finalUrl } = await generatePresignedUrl(
      fileName,
      contentType,
    );

    return NextResponse.json({ provider: "s3", uploadUrl, finalUrl });
  } catch (error: unknown) {
    console.error("User presign error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload authorization" },
      { status: 500 },
    );
  }
}
