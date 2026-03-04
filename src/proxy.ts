import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
    return NextResponse.next();
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
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
