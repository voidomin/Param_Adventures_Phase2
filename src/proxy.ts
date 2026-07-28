import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import type { RateLimitResult } from "@/lib/rate-limit";
import { findMatchingRule } from "@/lib/rate-limit-config";
import { isIpAllowed } from "@/lib/ip-allowlist";
import { prisma } from "@/lib/db";

interface RateLimitResultWrapper {
  response: NextResponse | null;
  result: RateLimitResult | null;
}

/**
 * CSRF Protection for state-changing requests.
 * Returns a response block (NextResponse) if verification fails, or null if allowed.
 */
function verifyCsrf(request: NextRequest, pathname: string, method: string): NextResponse | null {
  const isStateChanging = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  if (!isStateChanging || !pathname.startsWith("/api/")) {
    return null;
  }

  const isWebhook =
    pathname.startsWith("/api/bookings/webhook") ||
    pathname.startsWith("/api/webhooks/email");
  // Cron-triggered endpoints are called server-to-server (no browser Origin
  // header to check) and carry their own strong auth -- a timing-safe
  // x-cron-secret comparison, same security model as the webhook's HMAC
  // signature check above.
  const isCronEndpoint =
    pathname.startsWith("/api/admin/bookings/cleanup") ||
    pathname.startsWith("/api/admin/audit-logs/purge");
  if (isWebhook || isCronEndpoint) {
    return null;
  }

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

  return null;
}

/**
 * Rate limiting logic wrapper.
 * Returns both the response block (if limited) and the rateLimitResult metadata.
 */
function handleRateLimiting(request: NextRequest, pathname: string): RateLimitResultWrapper {
  const rule = findMatchingRule(pathname);
  if (!rule) {
    return { response: null, result: null };
  }

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

    const response = NextResponse.json(
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
    return { response, result: rateLimitResult };
  }

  return { response: null, result: rateLimitResult };
}

/**
 * Restricts /admin and /api/admin/* to an operator-configured IP allowlist,
 * if one is set. Excludes the bootstrap and cron-cleanup endpoints, which
 * are called server-to-server (GitHub Actions, dev bootstrap) from IPs that
 * have nothing to do with staff office/VPN ranges and already carry their
 * own strong auth. An empty/unset allowlist means no restriction -- this is
 * opt-in, not on by default, so it can't accidentally lock out the only
 * admin before it's deliberately configured.
 *
 * Reads the "Admin IP Allowlist" admin setting (Settings → Security),
 * falling back to the ADMIN_IP_ALLOWLIST env var for pre-deploy
 * bootstrapping. This is a database read on every /admin request -- a
 * deliberate trade-off for admin-editability without a redeploy; runs on
 * the Node.js runtime (see `export const config` below) rather than the
 * default Edge runtime specifically so this Prisma call works at all. If
 * the read itself fails (e.g. a DB hiccup), fails open (allows the
 * request) rather than locking out the admin panel over an unrelated
 * outage -- this feature is opt-in hardening, not the primary auth gate.
 */
async function verifyAdminIpAllowlist(request: NextRequest, pathname: string): Promise<NextResponse | null> {
  const isAdminPath =
    pathname.startsWith("/admin") ||
    (pathname.startsWith("/api/admin") &&
      !pathname.startsWith("/api/admin/bootstrap") &&
      !pathname.startsWith("/api/admin/bookings/cleanup") &&
      !pathname.startsWith("/api/admin/audit-logs/purge"));

  if (!isAdminPath) return null;

  let allowlistRaw: string | undefined;
  try {
    const setting = await prisma.platformSetting.findUnique({ where: { key: "admin_ip_allowlist" } });
    allowlistRaw = setting?.value || process.env.ADMIN_IP_ALLOWLIST;
  } catch (error) {
    console.error("[ADMIN_IP_ALLOWLIST] Failed to read setting, failing open:", error);
    return null;
  }

  if (!allowlistRaw) return null;

  const allowlist = allowlistRaw.split(",").map((e) => e.trim()).filter(Boolean);
  if (allowlist.length === 0) return null;

  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "";

  if (!ip || !isIpAllowed(ip, allowlist)) {
    console.warn(`[ADMIN_IP_BLOCKED] Denied ${pathname} from ${ip || "unknown"}`);
    return NextResponse.json({ error: "Access denied from this network." }, { status: 403 });
  }

  return null;
}

/**
 * Route protection middleware. Runs on the Node.js runtime (see `config`
 * below) so verifyAdminIpAllowlist can read PlatformSetting via Prisma.
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // ─── Admin IP Allowlist ─────────────────────────────────
  const ipBlock = await verifyAdminIpAllowlist(request, pathname);
  if (ipBlock) {
    return ipBlock;
  }

  // ─── CSRF Protection ───────────────────────────────────
  const csrfBlock = verifyCsrf(request, pathname, method);
  if (csrfBlock) {
    return csrfBlock;
  }

  // ─── Rate Limiting ─────────────────────────────────────
  const { response: rateLimitBlock, result: rateLimitResult } = handleRateLimiting(request, pathname);
  if (rateLimitBlock) {
    return rateLimitBlock;
  }

  // ─── Public routes ─────────────────────────────────────
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
    "/api/auth/verify-email",
    "/api/auth/google",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/api/categories",
    "/api/experiences",
    "/api/blog",
    "/blog",
    "/our-story",
    "/api/admin/bootstrap",
    "/api/admin/bookings/cleanup",
    "/api/admin/audit-logs/purge",
    "/api/bookings/webhook",
    "/api/webhooks/email",
    "/api/health",
    "/api/leads",
    "/api/quotes",
    "/api/proxy-image",
    "/privacy",
    "/terms",
    "/refunds",
    "/why-param-adventures",
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

  // ─── Static assets and Next.js internals ───────────────
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
  // No `runtime` key here: files named proxy.ts (Next.js 16's renamed
  // middleware convention) always run on the Node.js runtime already --
  // declaring it explicitly is a build error, not just redundant. That's
  // exactly why the admin-IP-allowlist check above can safely use
  // Prisma/pg, which need real Node APIs unavailable on the legacy Edge
  // runtime middleware.ts used.
  matcher: [
    // Match all routes except static files and Next.js internals
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", // NOSONAR: String.raw breaks Turbopack build static analysis
    "/(api|trpc)(.*)",
  ],
};
