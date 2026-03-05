import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth";
import { generatePresignedUrl } from "@/lib/s3";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);
    if (!payload)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

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
      console.log("Using Cloudinary for direct upload presign (User)");
      const { generateCloudinarySignature } = await import("@/lib/cloudinary");
      const cloudData = await generateCloudinarySignature(
        "param-adventures-users",
      );
      return NextResponse.json({ provider: "cloudinary", ...cloudData });
    }

    // Priority 2: AWS S3 (Direct Upload)
    const isS3Configured = !!(
      process.env.AWS_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET_NAME
    );

    const { uploadUrl, finalUrl } = await generatePresignedUrl(
      fileName,
      contentType,
    );

    console.log(
      `Using ${isS3Configured ? "S3" : "Mock"} for direct upload presign (User)`,
    );
    return NextResponse.json({ provider: "s3", uploadUrl, finalUrl });
  } catch (error: unknown) {
    console.error("Presign error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 },
    );
  }
}
