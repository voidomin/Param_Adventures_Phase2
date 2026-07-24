import { NextRequest, NextResponse } from "next/server";

// Exact hostnames and suffixes this proxy is allowed to fetch from. Only the
// platform's own known media hosts belong here -- this is what stops the
// route from being an open SSRF proxy for arbitrary internal/external URLs.
// Kept as an inline literal check (rather than delegating to a helper in
// another file) so static analysis can trace the guard directly against the
// fetch() call below.
const ALLOWED_HOST_SUFFIXES = [".amazonaws.com"];
const ALLOWED_HOSTS_EXACT = new Set(["res.cloudinary.com"]);

/**
 * GET /api/proxy-image?url=<encoded-url>
 * Proxies an external image and returns it as base64 data URL.
 * Used by the client-side PDF generator to embed images without CORS issues.
 *
 * SECURITY: `url` is restricted to the platform's own known media hosts
 * (same-origin, Cloudinary, S3). Without this check this route would be an
 * open, unauthenticated SSRF proxy -- fetching and returning the response of
 * any URL a caller supplies, including internal network addresses and cloud
 * metadata endpoints.
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

    const hostname = target.hostname.toLowerCase();
    const isAllowedHost =
      (target.protocol === "http:" || target.protocol === "https:") &&
      (hostname === request.nextUrl.hostname.toLowerCase() ||
        ALLOWED_HOSTS_EXACT.has(hostname) ||
        ALLOWED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix)));

    if (!isAllowedHost) {
      return NextResponse.json({ error: "URL host is not allowed" }, { status: 400 });
    }

    const response = await fetch(target.href, { next: { revalidate: 3600 } });
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
