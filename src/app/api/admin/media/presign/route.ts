import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { generatePresignedUrl } from "@/lib/s3";

export async function POST(request: Request) {
  try {
    const auth = await authorizeRequest(request, [
      "trip:create",
      "system:config",
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { fileName, contentType } = body;

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "Missing fileName or contentType" },
        { status: 400 },
      );
    }

    const { uploadUrl, finalUrl } = await generatePresignedUrl(
      fileName,
      contentType,
    );

    return NextResponse.json({ uploadUrl, finalUrl });
  } catch (error: any) {
    console.error("Presign error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 },
    );
  }
}
