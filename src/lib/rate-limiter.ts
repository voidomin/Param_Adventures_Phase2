/**
 * Lightweight In-Memory Rate Limiter (v1.0.2)
 * 
 * Optimized for monolith deployment. Provides fixed-window throttling 
 * to protect sensitive endpoints from abuse.
 */

interface RateLimitOptions {
  limit: number;      // Max number of requests
  windowMs: number;   // Time window in milliseconds
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

interface Bucket {
  count: number;
  expiresAt: number;
}

export class RateLimiter {
  private readonly cache: Map<string, Bucket> = new Map();
  private readonly options: RateLimitOptions;
  private readonly nowFn: () => number;

  constructor(options: RateLimitOptions, nowFn: () => number = Date.now) {
    this.options = options;
    this.nowFn = nowFn;
    
    // Periodic cleanup of expired buckets every 5 minutes to prevent memory leaks
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }

  /**
   * Check if a request should be rate limited.
   */
  public check(key: string): RateLimitResult {
    const now = this.nowFn();
    let bucket = this.cache.get(key);

    // Reset bucket if expired or doesn't exist
    if (!bucket || now > bucket.expiresAt) {
      bucket = {
        count: 0,
        expiresAt: now + this.options.windowMs
      };
    }

    bucket.count += 1;
    this.cache.set(key, bucket);

    const success = bucket.count <= this.options.limit;
    
    return {
      success,
      limit: this.options.limit,
      remaining: Math.max(0, this.options.limit - bucket.count),
      reset: bucket.expiresAt,
    };
  }

  /**
   * Internal memory management: removes stale entries.
   */
  private cleanup() {
    const now = this.nowFn();
    for (const [key, bucket] of this.cache.entries()) {
      if (now > bucket.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Global instances for common use cases
export const webhookLimiter = new RateLimiter({ limit: 10, windowMs: 60 * 1000 }); // 10 per minute
export const snapshotLimiter = new RateLimiter({ limit: 5, windowMs: 15 * 60 * 1000 }); // 5 per 15 mins
export const authLimiter = new RateLimiter({ limit: 20, windowMs: 60 * 1000 }); // 20 per minute
