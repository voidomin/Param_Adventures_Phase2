import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import type { RateLimitResult } from "@/lib/rate-limit";
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

  // ─── CSRF Protection for state-changing requests ────────
  const method = request.method;
  const isStateChanging = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (isStateChanging && pathname.startsWith("/api/")) {
    const isWebhook = pathname.startsWith("/api/bookings/webhook");

    if (!isWebhook) {
      const origin = request.headers.get("origin");
      const referer = request.headers.get("referer");
      const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";

      let originHost = "";
      if (origin) {
        try {
          originHost = new URL(origin).host;
        } catch {
          // Invalid URL
        }
      } else if (referer) {
        try {
          originHost = new URL(referer).host;
        } catch {
          // Invalid URL
        }
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      let appUrlHost = "";
      if (appUrl) {
        try {
          appUrlHost = new URL(appUrl).host;
        } catch {
          // Invalid URL
        }
      }

      const expectedHosts = [host];
      if (appUrlHost) {
        expectedHosts.push(appUrlHost);
      }

      if (!originHost || !expectedHosts.includes(originHost)) {
        console.warn(
          `[CSRF_ATTACK] Blocked ${method} request to ${pathname} from origin/referer: ${
            origin || referer || "none"
          }. Expected: ${expectedHosts.join(" or ")}`
        );
        return NextResponse.json(
          { error: "CSRF verification failed. Request untrusted." },
          { status: 403 }
        );
      }
    }
  }

  // ─── 1. Rate Limiting ──────────────────────────────────
  const rule = findMatchingRule(pathname);
  let rateLimitResult: RateLimitResult | null = null;

  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";

  if (rule) {
    const key = `${ip}:${rule.pathPrefix}`;
    rateLimitResult = rateLimit(key, rule.limit, rule.windowMs);

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
    "/our-story",
    "/api/admin/bootstrap",
    "/api/bookings/webhook",
    "/api/health",
    "/api/leads",
    "/api/quotes",
    "/api/proxy-image",
  ];

  // Check exact match or prefix match for public paths
  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );

  if (isPublic) {
    const response = NextResponse.next();
    if (rateLimitResult) {
      response.headers.set("X-RateLimit-Limit", String(rateLimitResult.limit));
      response.headers.set(
        "X-RateLimit-Remaining",
        String(rateLimitResult.remaining),
      );
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
  if (rateLimitResult) {
    response.headers.set("X-RateLimit-Limit", String(rateLimitResult.limit));
    response.headers.set(
      "X-RateLimit-Remaining",
      String(rateLimitResult.remaining),
    );
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
