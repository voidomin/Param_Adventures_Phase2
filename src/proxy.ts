import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { findMatchingRule } from "@/lib/rate-limit-config";

/**
 * Route protection middleware.
 *
 * Strategy:
 * - Public routes: accessible to everyone (landing, experiences, blogs, auth endpoints)
 * - Protected routes: require valid JWT in cookies (/admin/*, /bookings/*, /api/auth/me)
 * - API auth routes: always public (login, register, logout)
 *
 * Note: Full JWT verification (crypto) can't run in Edge middleware,
 * so we only check for token presence here. Actual verification happens
 * in the API route handlers via verifyAccessToken().
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── 1. Rate Limiting ──────────────────────────────────
  const rule = findMatchingRule(pathname);
  if (rule) {
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";

    const key = `${ip}:${rule.pathPrefix}`;
    const rateLimitResult = rateLimit(key, rule.limit, rule.windowMs);

    if (!rateLimitResult.success) {
      const retryAfterSeconds = Math.ceil(
        (rateLimitResult.resetAt - Date.now()) / 1000,
      );

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
            "X-RateLimit-Limit": String(rateLimitResult.limit),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }
    // Note: We'll attach rate limit headers to the final response if possible,
    // but Next.js middleware returns allow us to pass headers to the next response.
  }

  // ─── Always-public routes ──────────────────────────────
  const publicPaths = [
    "/",
    "/experiences",
    "/blogs",
    "/about",
    "/contact",
    "/login",
    "/register",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/logout",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/forgot-password",
    "/reset-password",
    "/api/categories",
    "/api/experiences",
    "/api/blog",
    "/blog",
  ];

  // Check exact match or prefix match for public paths
  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );

  if (isPublic) {
    const response = NextResponse.next();
    if (rule) {
      const forwarded = request.headers.get("x-forwarded-for");
      const realIp = request.headers.get("x-real-ip");
      const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";
      const key = `${ip}:${rule.pathPrefix}`;
      const result = rateLimit(key, rule.limit, rule.windowMs);
      response.headers.set("X-RateLimit-Limit", String(result.limit));
      response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    }
    return response;
  }

  // ─── Static assets and Next.js internals — always pass ─
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // ─── Protected routes: check for access token ──────────
  const accessToken = request.cookies.get("accessToken")?.value;

  if (!accessToken) {
    // For API routes, return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    // For page routes, redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Token exists — let the route handler verify it
  const response = NextResponse.next();

  // Attach rate limit headers if a rule was matched
  if (rule) {
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";
    const key = `${ip}:${rule.pathPrefix}`;
    // Re-check just to get the result (or we could have stored it)
    const result = rateLimit(key, rule.limit, rule.windowMs);
    response.headers.set("X-RateLimit-Limit", String(result.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  }

  return response;
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", // NOSONAR: String.raw breaks Turbopack build static analysis
    "/(api|trpc)(.*)",
  ],
};
