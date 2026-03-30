import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth";
import { mediaFactory } from "@/lib/media/factory";
import { z } from "zod";

const presignSchema = z.object({
  fileName: z.string().min(1, "fileName is required"),
  contentType: z.string().min(1, "contentType is required"),
});

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

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 },
      );
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

    // Request presign url from the dynamically active provider
    const provider = await mediaFactory.getProvider();
    const presignData = await provider.getPresignData(fileName, contentType);

    return NextResponse.json(presignData);
  } catch (error: unknown) {
    console.error("User presign error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload authorization" },
      { status: 500 },
    );
  }
}
