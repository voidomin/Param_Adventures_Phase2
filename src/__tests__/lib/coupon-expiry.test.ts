import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isExpiredIST } from "@/lib/coupon-engine";

describe("isExpiredIST", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false at 11:30 PM IST on the date of expiry", () => {
    // 2026-08-31 23:30:00 IST = 2026-08-31 18:00:00 UTC
    vi.setSystemTime(new Date("2026-08-31T18:00:00.000Z"));

    // Expiry date stored as 2026-08-31
    const expiryDate = new Date("2026-08-31T00:00:00.000Z");
    expect(isExpiredIST(expiryDate)).toBe(false);
  });

  it("returns true at 12:00:01 AM IST on the day after expiry", () => {
    // 2026-09-01 00:00:01 IST = 2026-08-31 18:30:01 UTC
    vi.setSystemTime(new Date("2026-08-31T18:30:01.000Z"));

    const expiryDate = new Date("2026-08-31T00:00:00.000Z");
    expect(isExpiredIST(expiryDate)).toBe(true);
  });

  it("returns true for invalid dates", () => {
    expect(isExpiredIST("invalid-date")).toBe(true);
  });
});
