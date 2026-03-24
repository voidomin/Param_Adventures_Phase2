import { describe, it, expect } from "vitest";
import { RATE_LIMIT_RULES, findMatchingRule } from "@/lib/rate-limit-config";

describe("rate-limit-config", () => {
  it("exports valid RATE_LIMIT_RULES array", () => {
    expect(Array.isArray(RATE_LIMIT_RULES)).toBe(true);
    expect(RATE_LIMIT_RULES.length).toBeGreaterThan(0);
  });

  describe("findMatchingRule", () => {
    it("matches exact authentication endpoints", () => {
      const loginRule = findMatchingRule("/api/auth/login");
      expect(loginRule).toBeDefined();
      expect(loginRule?.label).toBe("Auth:Login");
      expect(loginRule?.limit).toBe(5);

      const registerRule = findMatchingRule("/api/auth/register");
      expect(registerRule).toBeDefined();
      expect(registerRule?.label).toBe("Auth:Register");
    });

    it("matches transactional endpoints", () => {
      const bookingsRule = findMatchingRule("/api/bookings");
      expect(bookingsRule).toBeDefined();
      expect(bookingsRule?.label).toBe("Bookings");

      // Verify it matches sub-paths
      const specificBookingRule = findMatchingRule("/api/bookings/123");
      expect(specificBookingRule).toEqual(bookingsRule);
    });

    it("falls back to general api limit for unmatched api routes", () => {
      const generalRule = findMatchingRule("/api/some-new-feature");
      expect(generalRule).toBeDefined();
      expect(generalRule?.label).toBe("General");
      expect(generalRule?.limit).toBe(500); // from our config
    });

    it("returns undefined for non-api routes", () => {
      const nonApiRule = findMatchingRule("/about-us");
      expect(nonApiRule).toBeUndefined();
    });
  });
});
