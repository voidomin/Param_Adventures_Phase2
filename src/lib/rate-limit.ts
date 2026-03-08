/**
 * In-Memory Sliding Window Rate Limiter
 *
 * Tracks request counts per key (typically IP + path prefix) within a
 * configurable time window. Designed to be swappable with a Redis-backed
 * store when scaling to multiple server instances.
 *
 * @module rate-limit
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp (ms) when this window expires
}

/** In-memory store keyed by identifier (e.g. "1.2.3.4:/api/auth/login") */
const store = new Map<string, RateLimitEntry>();

/**
 * Periodically sweep expired entries to prevent unbounded memory growth.
 * Runs every 60 seconds. The timer is unref'd so it doesn't keep Node alive.
 */
const CLEANUP_INTERVAL_MS = 60_000;

if (typeof globalThis !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Prevent the cleanup timer from keeping the process alive
  if (timer && typeof timer === "object" && "unref" in timer) {
    (timer as NodeJS.Timeout).unref();
  }
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean;
  /** How many requests remain in the current window */
  remaining: number;
  /** The maximum number of requests allowed per window */
  limit: number;
  /** Unix timestamp (ms) when the current window resets */
  resetAt: number;
}

/**
 * Check and consume one request for the given key.
 *
 * @param key       Unique identifier, e.g. `${ip}:${pathPrefix}`
 * @param limit     Maximum requests allowed per window
 * @param windowMs  Duration of the rate limit window in milliseconds
 * @returns         Result indicating whether the request is allowed
 *
 * @example
 * ```ts
 * const result = rateLimit("1.2.3.4:/api/auth/login", 5, 15 * 60 * 1000);
 * if (!result.success) {
 *   return new NextResponse("Too Many Requests", { status: 429 });
 * }
 * ```
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // If no entry exists or the window has expired, start a new window
  if (!entry || now >= entry.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, limit, resetAt };
  }

  // Window is still active — increment the counter
  entry.count += 1;

  if (entry.count > limit) {
    return {
      success: false,
      remaining: 0,
      limit,
      resetAt: entry.resetAt,
    };
  }

  return {
    success: true,
    remaining: limit - entry.count,
    limit,
    resetAt: entry.resetAt,
  };
}
