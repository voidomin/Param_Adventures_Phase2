import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { mediaFactory } from "@/lib/media/factory";
import { z } from "zod";

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

    // Request presign url from the dynamically active provider
    const provider = await mediaFactory.getProvider();
    const presignData = await provider.getPresignData(fileName, contentType);

    return NextResponse.json(presignData);
  } catch (error: unknown) {
    console.error("Presign error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 },
    );
  }
}
