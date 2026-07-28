import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import proxy from "../proxy";
import { rateLimit } from "@/lib/rate-limit";
import { findMatchingRule } from "@/lib/rate-limit-config";
import { prisma } from "@/lib/db";

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/rate-limit-config", () => ({
  findMatchingRule: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    platformSetting: {
      findUnique: vi.fn(),
    },
  },
}));

const mockPlatformSettingFindUnique = vi.mocked(prisma.platformSetting.findUnique);

// Helper to create next request
function createRequest(url: string, init?: RequestInit & { cookies?: Record<string, string> }) {
  const { cookies, ...requestInit } = init ?? {};
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
    delete process.env.ADMIN_IP_ALLOWLIST;
    mockPlatformSettingFindUnique.mockResolvedValue(null);
    vi.mocked(rateLimit).mockReturnValue({
      success: true,
      limit: 100,
      remaining: 99,
      resetAt: Date.now() + 60000,
    });
    vi.mocked(findMatchingRule).mockReturnValue(undefined);
  });

  describe("Rate Limiting", () => {
    it("returns 429 when rate limit checks fail", async () => {
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
      const res = await proxy(req);

      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBeDefined();
    });
  });

  describe("Public Routes Routing", () => {
    it("allows public page routes without authentication", async () => {
      const publicPaths = ["/", "/experiences", "/about", "/login", "/register", "/privacy", "/terms", "/refunds", "/why-param-adventures"];
      for (const path of publicPaths) {
        const req = createRequest(`http://localhost${path}`);
        const res = await proxy(req);
        expect(res.status).toBe(200); 
      }
    });

    it("allows public experience detail paths", async () => {
      const req = createRequest("http://localhost/experiences/everest-base-camp");
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });
  });

  describe("Protected Routes Routing", () => {
    it("redirects page requests to /login if accessToken is missing", async () => {
      const req = createRequest("http://localhost/admin/dashboard");
      const res = await proxy(req);

      expect(res.status).toBe(307); // Temporary redirect
      expect(res.headers.get("location")).toBe("http://localhost/login?redirect=%2Fadmin%2Fdashboard");
    });

    it("returns 401 for API requests if accessToken is missing", async () => {
      const req = createRequest("http://localhost/api/admin/bookings");
      const res = await proxy(req);

      expect(res.status).toBe(401);
    });

    it("allows protected route access when accessToken is present", async () => {
      const req = createRequest("http://localhost/admin/dashboard", {
        cookies: { accessToken: "valid-jwt" },
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });
  });

  describe("CSRF Protection", () => {
    it("allows GET requests to api without CSRF check", async () => {
      const req = createRequest("http://localhost/api/experiences");
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });

    it("allows state-changing requests when Host header matches Referer host", async () => {
      const req = createRequest("http://localhost/api/bookings", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          referer: "http://localhost:3000/experiences/everest",
        },
        cookies: { accessToken: "valid-token" },
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });

    it("allows state-changing requests when Origin matches APP_URL host", async () => {
      const req = createRequest("http://localhost/api/bookings", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "https://example.com",
        },
        cookies: { accessToken: "valid-token" },
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });

    it("blocks state-changing requests if Origin and Referer are mismatched", async () => {
      const req = createRequest("http://localhost/api/bookings", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "https://evil.com",
        },
        cookies: { accessToken: "valid-token" },
      });
      const res = await proxy(req);
      expect(res.status).toBe(403);
    });

    it("blocks state-changing requests if Origin and Referer are missing", async () => {
      const req = createRequest("http://localhost/api/bookings", {
        method: "POST",
        headers: {
          host: "localhost:3000",
        },
        cookies: { accessToken: "valid-token" },
      });
      const res = await proxy(req);
      expect(res.status).toBe(403);
    });

    it("exempts Razorpay webhook endpoint from CSRF verification", async () => {
      const req = createRequest("http://localhost/api/bookings/webhook", {
        method: "POST",
        headers: {
          host: "localhost:3000",
        },
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });

    it("exempts the abandoned-bookings cleanup cron endpoint from CSRF verification", async () => {
      const req = createRequest("http://localhost/api/admin/bookings/cleanup", {
        method: "POST",
        headers: {
          host: "localhost:3000",
        },
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });

    it("exempts the audit-log purge cron endpoint from CSRF verification", async () => {
      const req = createRequest("http://localhost/api/admin/audit-logs/purge", {
        method: "POST",
        headers: {
          host: "localhost:3000",
        },
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });

    it("exempts the email delivery webhook from CSRF verification", async () => {
      const req = createRequest("http://localhost/api/webhooks/email", {
        method: "POST",
        headers: {
          host: "localhost:3000",
        },
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });
  });

  describe("Admin IP Allowlist", () => {
    it("allows any network when ADMIN_IP_ALLOWLIST is unset", async () => {
      const req = createRequest("http://localhost/api/admin/bookings", {
        headers: { "x-forwarded-for": "203.0.113.9" },
        cookies: { accessToken: "valid-jwt" },
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });

    it("reads the allowlist from the admin setting, not just the env var", async () => {
      mockPlatformSettingFindUnique.mockResolvedValue({ key: "admin_ip_allowlist", value: "198.51.100.0/24" } as any);
      const req = createRequest("http://localhost/api/admin/bookings", {
        headers: { "x-forwarded-for": "203.0.113.9" },
        cookies: { accessToken: "valid-jwt" },
      });
      const res = await proxy(req);
      expect(res.status).toBe(403);
    });

    it("prefers the admin setting over the env var when both are present", async () => {
      process.env.ADMIN_IP_ALLOWLIST = "203.0.113.0/24";
      mockPlatformSettingFindUnique.mockResolvedValue({ key: "admin_ip_allowlist", value: "198.51.100.0/24" } as any);
      const req = createRequest("http://localhost/api/admin/bookings", {
        // Allowed by the env var's range, but not the DB setting's -- DB should win.
        headers: { "x-forwarded-for": "203.0.113.9" },
        cookies: { accessToken: "valid-jwt" },
      });
      const res = await proxy(req);
      expect(res.status).toBe(403);
    });

    it("fails open (allows the request) if the settings read throws", async () => {
      mockPlatformSettingFindUnique.mockRejectedValue(new Error("DB unavailable"));
      const req = createRequest("http://localhost/api/admin/bookings", {
        headers: { "x-forwarded-for": "203.0.113.9" },
        cookies: { accessToken: "valid-jwt" },
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });

    it("blocks a non-allowlisted IP from an admin API route", async () => {
      process.env.ADMIN_IP_ALLOWLIST = "198.51.100.0/24";
      const req = createRequest("http://localhost/api/admin/bookings", {
        headers: { "x-forwarded-for": "203.0.113.9" },
        cookies: { accessToken: "valid-jwt" },
      });
      const res = await proxy(req);
      expect(res.status).toBe(403);
    });

    it("blocks a non-allowlisted IP from an admin page route", async () => {
      process.env.ADMIN_IP_ALLOWLIST = "198.51.100.0/24";
      const req = createRequest("http://localhost/admin/dashboard", {
        headers: { "x-forwarded-for": "203.0.113.9" },
        cookies: { accessToken: "valid-jwt" },
      });
      const res = await proxy(req);
      expect(res.status).toBe(403);
    });

    it("allows an allowlisted IP through to an admin route", async () => {
      process.env.ADMIN_IP_ALLOWLIST = "198.51.100.0/24";
      const req = createRequest("http://localhost/api/admin/bookings", {
        headers: { "x-forwarded-for": "198.51.100.42" },
        cookies: { accessToken: "valid-jwt" },
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });

    it("still allows the cron cleanup endpoint through regardless of the allowlist", async () => {
      process.env.ADMIN_IP_ALLOWLIST = "198.51.100.0/24";
      const req = createRequest("http://localhost/api/admin/bookings/cleanup", {
        method: "POST",
        headers: { host: "localhost:3000", "x-forwarded-for": "203.0.113.9" },
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });

    it("still allows the audit-log purge endpoint through regardless of the allowlist", async () => {
      process.env.ADMIN_IP_ALLOWLIST = "198.51.100.0/24";
      const req = createRequest("http://localhost/api/admin/audit-logs/purge", {
        method: "POST",
        headers: { host: "localhost:3000", "x-forwarded-for": "203.0.113.9" },
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });

    it("still allows the bootstrap endpoint through regardless of the allowlist", async () => {
      process.env.ADMIN_IP_ALLOWLIST = "198.51.100.0/24";
      const req = createRequest("http://localhost/api/admin/bootstrap", {
        headers: { "x-forwarded-for": "203.0.113.9" },
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });

    it("does not restrict non-admin routes", async () => {
      process.env.ADMIN_IP_ALLOWLIST = "198.51.100.0/24";
      const req = createRequest("http://localhost/api/experiences", {
        headers: { "x-forwarded-for": "203.0.113.9" },
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });
  });

  describe("New Public Auth Routes", () => {
    it("allows the verify-email page and API route without authentication", async () => {
      const pageRes = await proxy(createRequest("http://localhost/verify-email"));
      expect(pageRes.status).toBe(200);

      const apiRes = await proxy(createRequest("http://localhost/api/auth/verify-email", {
        method: "POST",
        headers: { host: "localhost:3000", origin: "http://localhost:3000" },
      }));
      expect(apiRes.status).toBe(200);
    });

    it("allows the Google sign-in API route without authentication", async () => {
      const res = await proxy(createRequest("http://localhost/api/auth/google", {
        method: "POST",
        headers: { host: "localhost:3000", origin: "http://localhost:3000" },
      }));
      expect(res.status).toBe(200);
    });
  });
});
