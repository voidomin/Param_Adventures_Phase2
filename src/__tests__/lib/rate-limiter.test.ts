import { describe, it, expect, vi, beforeEach } from "vitest";
import { RateLimiter } from "@/lib/rate-limiter";

describe("RateLimiter", () => {
  let currentTime = 1000;
  const manualClock = () => currentTime;

  it("allows requests under the limit", () => {
    const limiter = new RateLimiter({ limit: 2, windowMs: 1000 }, manualClock);
    const key = "test-ip";

    const res1 = limiter.check(key);
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(1);

    const res2 = limiter.check(key);
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(0);
  });

  it("blocks requests over the limit", () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 1000 }, manualClock);
    const key = "test-ip";

    limiter.check(key);
    const res2 = limiter.check(key);
    
    expect(res2.success).toBe(false);
    expect(res2.remaining).toBe(0);
  });

  it("resets after the window expires", () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 1000 }, manualClock);
    const key = "test-ip";
    currentTime = 1000;

    expect(limiter.check(key).success).toBe(true);
    expect(limiter.check(key).success).toBe(false);

    // Explicitly advance the manual clock
    currentTime += 2000;

    const res3 = limiter.check(key);
    expect(res3.success).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it("tracks different keys independently", () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 1000 }, manualClock);
    
    expect(limiter.check("ip-1").success).toBe(true);
    expect(limiter.check("ip-1").success).toBe(false);
    expect(limiter.check("ip-2").success).toBe(true);
  });
});
