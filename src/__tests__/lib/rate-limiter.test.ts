import { describe, it, expect, vi, beforeEach } from "vitest";
import { RateLimiter } from "@/lib/rate-limiter";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  const now = () => Date.now();

  it("allows requests under the limit", () => {
    const limiter = new RateLimiter({ limit: 2, windowMs: 1000 }, now);
    const key = "test-ip";

    const res1 = limiter.check(key);
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(1);

    const res2 = limiter.check(key);
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(0);
  });

  it("blocks requests over the limit", () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 1000 }, now);
    const key = "test-ip";

    limiter.check(key);
    const res2 = limiter.check(key);
    
    expect(res2.success).toBe(false);
    expect(res2.remaining).toBe(0);
  });

  it("resets after the window expires", () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 1000 }, now);
    const key = "test-ip";

    expect(limiter.check(key).success).toBe(true);
    expect(limiter.check(key).success).toBe(false);

    // Fast forward time - use both advance and setSystemTime for guaranteed vitest sync
    const future = Date.now() + 2000;
    vi.setSystemTime(future);

    const res3 = limiter.check(key);
    expect(res3.success).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it("tracks different keys independently", () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 1000 }, now);
    
    expect(limiter.check("ip-1").success).toBe(true);
    expect(limiter.check("ip-1").success).toBe(false);
    expect(limiter.check("ip-2").success).toBe(true);
  });
});
