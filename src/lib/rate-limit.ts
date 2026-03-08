/**
 * In-Memory Sliding Window Rate Limiter (Edge-Compatible)
 *
 * Tracks request counts per key (typically IP + path prefix) within a
 * configurable time window. Designed to work in Next.js Edge Runtime.
 *
 * @module rate-limit
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp (ms) when this window expires
}

/**
 * In-memory store.
 * Note: In Edge Runtime production (e.g. Vercel), this state is only
 * persistent for the lifetime of the warm instance. For true persistence
 * across instances, a Redis store is required.
 */
const store = new Map<string, RateLimitEntry>();

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
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  // Lazy cleanup: occasionally remove an expired entry if we encounter it
  // or just handle the current key.
  let entry = store.get(key);

  // If entry exists but is expired, treat it as non-existent
  if (entry && now >= entry.resetAt) {
    store.delete(key);
    entry = undefined;
  }

  // If no entry exists, start a new window
  if (!entry) {
    const resetAt = now + windowMs;
    const newEntry = { count: 1, resetAt };
    store.set(key, newEntry);
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
