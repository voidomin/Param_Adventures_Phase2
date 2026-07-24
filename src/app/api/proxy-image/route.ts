import { NextRequest, NextResponse } from "next/server";
import { isAllowedMediaHost } from "@/lib/utils/url-safety";

function isAllowedImageHost(target: URL, requestHost: string): boolean {
  if (target.protocol !== "http:" && target.protocol !== "https:") return false;
  if (target.hostname.toLowerCase() === requestHost.toLowerCase()) return true;
  return isAllowedMediaHost(target.toString());
}

/**
 * GET /api/proxy-image?url=<encoded-url>
 * Proxies an external image and returns it as base64 data URL.
 * Used by the client-side PDF generator to embed images without CORS issues.
 *
 * SECURITY: `url` is restricted to the platform's own known media hosts
 * (same-origin, Cloudinary, S3) via isAllowedImageHost(). Without this check
 * this route would be an open, unauthenticated SSRF proxy -- fetching and
 * returning the response of any URL a caller supplies, including internal
 * network addresses and cloud metadata endpoints.
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "Missing url param" }, { status: 400 });
    }

    let target: URL;
    try {
      target = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid url param" }, { status: 400 });
    }

    if (!isAllowedImageHost(target, request.nextUrl.hostname)) {
      return NextResponse.json({ error: "URL host is not allowed" }, { status: 400 });
    }

    const response = await fetch(target, { next: { revalidate: 3600 } });
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
