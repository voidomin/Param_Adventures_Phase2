import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a new window on first request", () => {
    const now = Date.now();
    const result = rateLimit("k:new", 3, 1000);

    expect(result).toEqual({
      success: true,
      remaining: 2,
      limit: 3,
      resetAt: now + 1000,
    });
  });

  it("allows requests within limit then blocks over-limit", () => {
    expect(rateLimit("k:limit", 2, 1000).success).toBe(true);

    const second = rateLimit("k:limit", 2, 1000);
    const third = rateLimit("k:limit", 2, 1000);

    expect(second).toMatchObject({ success: true, remaining: 0, limit: 2 });
    expect(third).toMatchObject({ success: false, remaining: 0, limit: 2 });
  });

  it("resets the window once resetAt is reached", () => {
    const first = rateLimit("k:reset", 1, 1000);
    expect(first.success).toBe(true);

    vi.setSystemTime(first.resetAt);

    const afterReset = rateLimit("k:reset", 1, 1000);
    expect(afterReset.success).toBe(true);
    expect(afterReset.remaining).toBe(0);
    expect(afterReset.resetAt).toBe(first.resetAt + 1000);
  });

  it("tracks keys independently", () => {
    rateLimit("k:a", 1, 1000);
    const aBlocked = rateLimit("k:a", 1, 1000);
    const bAllowed = rateLimit("k:b", 1, 1000);

    expect(aBlocked.success).toBe(false);
    expect(bAllowed.success).toBe(true);
  });
});
