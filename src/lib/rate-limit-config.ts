/**
 * Rate Limit Configuration
 *
 * Centralized, declarative configuration for all rate-limited routes.
 * Rules are matched FIRST-MATCH-WINS, so more specific paths must come
 * before broader prefixes.
 *
 * To add a new rate limit:
 *   1. Add a new entry to RATE_LIMIT_RULES below.
 *   2. That's it. The middleware picks it up automatically.
 *
 * @module rate-limit-config
 */

export interface RateLimitRule {
  /** URL path prefix to match against (e.g. "/api/auth/login") */
  pathPrefix: string;
  /** Maximum number of requests allowed per window */
  limit: number;
  /** Duration of the rate limit window in milliseconds */
  windowMs: number;
  /** Human-readable label for logging (optional) */
  label?: string;
}

/**
 * Rate limit rules ordered from most specific to least specific.
 * The middleware will use the FIRST matching rule for each request.
 */
export const RATE_LIMIT_RULES: RateLimitRule[] = [
  // ─── 🔴 Critical — Authentication Endpoints ──────────────
  // These are the most targeted endpoints for brute-force attacks.
  // 5 attempts per 15 minutes per IP.
  {
    pathPrefix: "/api/auth/login",
    limit: 5,
    windowMs: 15 * 60 * 1000,
    label: "Auth:Login",
  },
  {
    pathPrefix: "/api/auth/register",
    limit: 5,
    windowMs: 15 * 60 * 1000,
    label: "Auth:Register",
  },
  {
    pathPrefix: "/api/auth/forgot-password",
    limit: 5,
    windowMs: 15 * 60 * 1000,
    label: "Auth:ForgotPassword",
  },
  {
    pathPrefix: "/api/auth/reset-password",
    limit: 5,
    windowMs: 15 * 60 * 1000,
    label: "Auth:ResetPassword",
  },

  // ─── 🟠 High — Transactional Endpoints ───────────────────
  // These create database records or trigger payments.
  // 10 requests per minute per IP.
  {
    pathPrefix: "/api/bookings",
    limit: 10,
    windowMs: 60 * 1000,
    label: "Bookings",
  },
  {
    pathPrefix: "/api/leads",
    limit: 10,
    windowMs: 60 * 1000,
    label: "Leads",
  },

  // ─── 🟢 Default — All Other API Routes ───────────────────
  // General fallback for any /api/* route not matched above.
  // 60 requests per minute per IP.
  {
    pathPrefix: "/api/",
    limit: 60, // Fallback for production
    windowMs: 60 * 1000,
    label: "General",
  },
];

/**
 * Find the first rate limit rule matching the given pathname.
 *
 * @param pathname  The URL pathname (e.g. "/api/auth/login")
 * @returns         The matching rule, or undefined if no rule matches
 */
export function findMatchingRule(pathname: string): RateLimitRule | undefined {
  return RATE_LIMIT_RULES.find((rule) => pathname.startsWith(rule.pathPrefix));
}
