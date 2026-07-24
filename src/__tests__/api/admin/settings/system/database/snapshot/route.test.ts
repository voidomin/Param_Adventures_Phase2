import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeSystemRequest: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/rate-limiter", () => ({ snapshotLimiter: { check: vi.fn() } }));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findMany: vi.fn() },
    role: { findMany: vi.fn() },
    experience: { findMany: vi.fn() },
    category: { findMany: vi.fn() },
    slot: { findMany: vi.fn() },
    booking: { findMany: vi.fn() },
    payment: { findMany: vi.fn() },
    platformSetting: { findMany: vi.fn() },
    siteSetting: { findMany: vi.fn() },
  },
}));

import { GET } from "@/app/api/admin/settings/system/database/snapshot/route";
import { authorizeSystemRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { snapshotLimiter } from "@/lib/rate-limiter";
import { prisma } from "@/lib/db";

const mockAuthorizeSystemRequest = vi.mocked(authorizeSystemRequest);
const createRequest = (ip?: string) =>
  ({ headers: new Headers(ip ? { "x-forwarded-for": ip } : {}) }) as unknown as NextRequest;

describe("GET /api/admin/settings/system/database/snapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorizeSystemRequest.mockResolvedValue({ authorized: true, userId: "admin-1", roleName: "SUPER_ADMIN" } as any);
    vi.mocked(snapshotLimiter.check).mockReturnValue({ success: true, limit: 3, remaining: 2, reset: 123 } as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: "u1" }] as any);
    vi.mocked(prisma.role.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.experience.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.category.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.slot.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.booking.findMany).mockResolvedValue([{ id: "b1" }] as any);
    vi.mocked(prisma.payment.findMany).mockResolvedValue([{ id: "p1" }] as any);
    vi.mocked(prisma.platformSetting.findMany).mockResolvedValue([
      { key: "smtp_pass", value: "secret" },
      { key: "app_url", value: "https://x.com" },
    ] as any);
    vi.mocked(prisma.siteSetting.findMany).mockResolvedValue([{ key: "site_title", value: "Param" }] as any);
  });

  it("returns the auth response when unauthorized", async () => {
    mockAuthorizeSystemRequest.mockResolvedValue({ authorized: false, response: { status: 401 } } as any);

    const response = await GET(createRequest());
    expect((response as any).status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(snapshotLimiter.check).mockReturnValue({ success: false, limit: 3, remaining: 0, reset: 999 } as any);

    const response = await GET(createRequest("1.2.3.4"));
    expect(response.status).toBe(429);
  });

  it("returns a sanitized snapshot with a download filename", async () => {
    const response = await GET(createRequest("1.2.3.4"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.platformSettings).toEqual([{ key: "app_url", value: "https://x.com" }]);
    expect(data.data.siteSettings).toEqual([{ key: "site_title", value: "Param" }]);
    expect(response.headers.get("Content-Disposition")).toContain("attachment");
    expect(logActivity).toHaveBeenCalledWith(
      "DATABASE_SNAPSHOT_EXPORTED", "admin-1", "SYSTEM", "ALL",
      expect.objectContaining({ record_counts: { users: 1, bookings: 1, payments: 1 } }),
    );
  });

  it("returns 500 on an unexpected error", async () => {
    vi.mocked(prisma.user.findMany).mockRejectedValue(new Error("db down"));

    const response = await GET(createRequest("1.2.3.4"));
    expect(response.status).toBe(500);
  });
});
