import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { findMatchingRule } from "@/lib/rate-limit-config";

/**
 * Next.js Middleware — Rate Limiting
 *
 * Intercepts all /api/* requests, applies rate limiting based on the
 * configured rules, and returns 429 if the limit is exceeded.
 *
 * Standard response headers are included:
 *   - X-RateLimit-Limit
 *   - X-RateLimit-Remaining
 *   - Retry-After (only on 429)
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Find the rate limit rule for this path
  const rule = findMatchingRule(pathname);
  if (!rule) {
    // No rule matched — let the request through
    return NextResponse.next();
  }

  // Extract IP address from headers (works behind proxies like AWS ALB/CloudFront)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";

  // Build the rate limit key: IP + matched rule prefix
  const key = `${ip}:${rule.pathPrefix}`;
  const result = rateLimit(key, rule.limit, rule.windowMs);

  // If the request is blocked, return 429
  if (!result.success) {
    const retryAfterSeconds = Math.ceil((result.resetAt - Date.now()) / 1000);

    console.warn(
      `[RATE_LIMIT] Blocked ${ip} on ${pathname} (${rule.label || rule.pathPrefix}). Retry after ${retryAfterSeconds}s`,
    );

    return NextResponse.json(
      {
        error: "Too many requests. Please try again later.",
        retryAfter: retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  // Request is allowed — attach rate limit headers to the response
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));

  return response;
}

/**
 * Only run the middleware on API routes.
 * Static files, pages, and other assets are not rate-limited.
 */
export const config = {
  matcher: "/api/:path*",
};
