import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/proxy-image?url=<encoded-url>
 * Proxies an external image and returns it as base64 data URL.
 * Used by the client-side PDF generator to embed images without CORS issues.
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "Missing url param" }, { status: 400 });
    }

    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: 502 }
      );
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return NextResponse.json({
      dataUrl: `data:${contentType};base64,${base64}`,
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return NextResponse.json(
      { error: "Failed to proxy image." },
      { status: 500 }
    );
  }
}
