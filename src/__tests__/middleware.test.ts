import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import proxy from "../proxy";
import { rateLimit } from "@/lib/rate-limit";
import { findMatchingRule } from "@/lib/rate-limit-config";

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/rate-limit-config", () => ({
  findMatchingRule: vi.fn(),
}));

// Helper to create next request
function createRequest(url: string, init?: RequestInit & { cookies?: Record<string, string> }) {
  const { cookies, ...requestInit } = init || {};
  const req = new NextRequest(url, requestInit as any);
  if (cookies) {
    for (const [key, val] of Object.entries(cookies)) {
      req.cookies.set(key, val);
    }
  }
  return req;
}

describe("Next.js Middleware (Proxy)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
    vi.mocked(rateLimit).mockReturnValue({
      success: true,
      limit: 100,
      remaining: 99,
      resetAt: Date.now() + 60000,
    });
    vi.mocked(findMatchingRule).mockReturnValue(undefined);
  });

  describe("Rate Limiting", () => {
    it("returns 429 when rate limit checks fail", () => {
      vi.mocked(findMatchingRule).mockReturnValue({
        pathPrefix: "/api/auth/login",
        limit: 5,
        windowMs: 60000,
        label: "Auth Login",
      });
      vi.mocked(rateLimit).mockReturnValue({
        success: false,
        limit: 5,
        remaining: 0,
        resetAt: Date.now() + 10000,
      });

      const req = createRequest("http://localhost/api/auth/login", { 
        method: "POST", 
        headers: {
          host: "localhost",
          origin: "http://localhost",
        }
      });
      const res = proxy(req);

      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBeDefined();
    });
  });

  describe("Public Routes Routing", () => {
    it("allows public page routes without authentication", () => {
      const publicPaths = ["/", "/experiences", "/about", "/login", "/register"];
      for (const path of publicPaths) {
        const req = createRequest(`http://localhost${path}`);
        const res = proxy(req);
        expect(res.status).toBe(200); 
      }
    });

    it("allows public experience detail paths", () => {
      const req = createRequest("http://localhost/experiences/everest-base-camp");
      const res = proxy(req);
      expect(res.status).toBe(200);
    });
  });

  describe("Protected Routes Routing", () => {
    it("redirects page requests to /login if accessToken is missing", () => {
      const req = createRequest("http://localhost/admin/dashboard");
      const res = proxy(req);

      expect(res.status).toBe(307); // Temporary redirect
      expect(res.headers.get("location")).toBe("http://localhost/login?redirect=%2Fadmin%2Fdashboard");
    });

    it("returns 401 for API requests if accessToken is missing", () => {
      const req = createRequest("http://localhost/api/admin/bookings");
      const res = proxy(req);

      expect(res.status).toBe(401);
    });

    it("allows protected route access when accessToken is present", () => {
      const req = createRequest("http://localhost/admin/dashboard", {
        cookies: { accessToken: "valid-jwt" },
      });
      const res = proxy(req);
      expect(res.status).toBe(200);
    });
  });

  describe("CSRF Protection", () => {
    it("allows GET requests to api without CSRF check", () => {
      const req = createRequest("http://localhost/api/experiences");
      const res = proxy(req);
      expect(res.status).toBe(200);
    });

    it("allows state-changing requests when Host header matches Referer host", () => {
      const req = createRequest("http://localhost/api/bookings", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          referer: "http://localhost:3000/experiences/everest",
        },
        cookies: { accessToken: "valid-token" },
      });
      const res = proxy(req);
      expect(res.status).toBe(200);
    });

    it("allows state-changing requests when Origin matches APP_URL host", () => {
      const req = createRequest("http://localhost/api/bookings", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "https://example.com",
        },
        cookies: { accessToken: "valid-token" },
      });
      const res = proxy(req);
      expect(res.status).toBe(200);
    });

    it("blocks state-changing requests if Origin and Referer are mismatched", () => {
      const req = createRequest("http://localhost/api/bookings", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "https://evil.com",
        },
        cookies: { accessToken: "valid-token" },
      });
      const res = proxy(req);
      expect(res.status).toBe(403);
    });

    it("blocks state-changing requests if Origin and Referer are missing", () => {
      const req = createRequest("http://localhost/api/bookings", {
        method: "POST",
        headers: {
          host: "localhost:3000",
        },
        cookies: { accessToken: "valid-token" },
      });
      const res = proxy(req);
      expect(res.status).toBe(403);
    });

    it("exempts Razorpay webhook endpoint from CSRF verification", () => {
      const req = createRequest("http://localhost/api/bookings/webhook", {
        method: "POST",
        headers: {
          host: "localhost:3000",
        },
      });
      const res = proxy(req);
      expect(res.status).toBe(200);
    });
  });
});
