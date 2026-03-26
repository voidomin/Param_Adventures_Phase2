import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { generatePresignedUrl } from "@/lib/s3";

import { z } from "zod";

const S3_BUCKET_NAME =
  process.env.AWS_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME;

const presignSchema = z.object({
  fileName: z.string().min(1, "fileName is required"),
  contentType: z.string().min(1, "contentType is required"),
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
    const parseResult = presignSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { fileName, contentType } = parseResult.data;

    // Priority 1: Cloudinary (Direct Upload)
    if (process.env.CLOUDINARY_API_KEY) {
      console.log("Using Cloudinary for direct upload presign");
      const { generateCloudinarySignature } = await import("@/lib/cloudinary");
      const cloudData = await generateCloudinarySignature("param-adventures");
      return NextResponse.json({ provider: "cloudinary", ...cloudData });
    }

    // Priority 2: AWS S3 (Direct Upload)
    const isS3Configured = !!(
      process.env.AWS_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      S3_BUCKET_NAME
    );

    const { uploadUrl, finalUrl } = await generatePresignedUrl(
      fileName,
      contentType,
    );

    console.log(
      `Using ${isS3Configured ? "S3" : "Mock"} for direct upload presign`,
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
