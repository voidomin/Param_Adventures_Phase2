import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeSystemRequest: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/db", () => {
  const mockPrisma = {
    platformSetting: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
    siteSetting: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  };
  mockPrisma.$transaction = vi.fn().mockImplementation(async (cb: any) => cb(mockPrisma));
  return { prisma: mockPrisma };
});

import { GET, PATCH } from "@/app/api/admin/settings/system/route";
import { authorizeSystemRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { prisma } from "@/lib/db";

const mockAuthorizeSystemRequest = vi.mocked(authorizeSystemRequest);
const createRequest = (body?: unknown) =>
  ({
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers({ "x-forwarded-for": "1.2.3.4" }),
  }) as unknown as NextRequest;

describe("GET /api/admin/settings/system", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorizeSystemRequest.mockResolvedValue({ authorized: true, userId: "admin-1", roleName: "SUPER_ADMIN" } as any);
  });

  it("returns the auth response when unauthorized", async () => {
    mockAuthorizeSystemRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await GET(createRequest());
    expect(response.status).toBe(401);
  });

  it("returns platform and site settings, excluding site keys duplicated in platform", async () => {
    vi.mocked(prisma.platformSetting.findMany).mockResolvedValue([{ key: "app_url", value: "https://x.com" }] as any);
    vi.mocked(prisma.siteSetting.findMany).mockResolvedValue([
      { key: "site_title", value: "Param Adventures" },
      { key: "app_url", value: "stale-duplicate" },
      { key: "jwt_secret", value: "leaked" },
    ] as any);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.platform).toEqual([{ key: "app_url", value: "https://x.com" }]);
    expect(data.site).toEqual([{ key: "site_title", value: "Param Adventures" }]);
  });

  it("returns 500 on an unexpected error", async () => {
    vi.mocked(prisma.platformSetting.findMany).mockRejectedValue(new Error("db down"));

    const response = await GET(createRequest());
    expect(response.status).toBe(500);
  });
});

describe("PATCH /api/admin/settings/system", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma));
    mockAuthorizeSystemRequest.mockResolvedValue({ authorized: true, userId: "admin-1", roleName: "SUPER_ADMIN" } as any);
    vi.mocked(prisma.platformSetting.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.siteSetting.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.platformSetting.upsert).mockResolvedValue({} as any);
    vi.mocked(prisma.siteSetting.upsert).mockResolvedValue({} as any);
  });

  it("returns the auth response when unauthorized", async () => {
    mockAuthorizeSystemRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await PATCH(createRequest({}));
    expect(response.status).toBe(401);
  });

  it("upserts site settings and logs the change", async () => {
    const response = await PATCH(createRequest({ site: [{ key: "site_title", value: "New Title" }] }));

    expect(response.status).toBe(200);
    expect(prisma.siteSetting.upsert).toHaveBeenCalledWith({
      where: { key: "site_title" },
      update: { value: "New Title" },
      create: { key: "site_title", value: "New Title" },
    });
    expect(logActivity).toHaveBeenCalledWith(
      "UPDATE_SITE_SETTING", "admin-1", "SYSTEM", "site_title",
      expect.objectContaining({ to: "New Title", ip: "1.2.3.4" }),
      expect.anything(),
    );
  });

  it("forces statutory keys into PLATFORM even when sent under 'site' and uppercases them", async () => {
    const response = await PATCH(createRequest({ site: [{ key: "gstNumber", value: "abc123gst" }] }));

    expect(response.status).toBe(200);
    expect(prisma.platformSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: "gstNumber" }, create: { key: "gstNumber", value: "ABC123GST" } }),
    );
    expect(prisma.siteSetting.deleteMany).toHaveBeenCalledWith({ where: { key: "gstNumber" } });
  });

  it("skips logging when the value hasn't changed", async () => {
    vi.mocked(prisma.siteSetting.findUnique).mockResolvedValue({ key: "site_title", value: "Same" } as any);

    await PATCH(createRequest({ site: [{ key: "site_title", value: "Same" }] }));

    expect(logActivity).not.toHaveBeenCalled();
  });

  it("skips entries with an empty key", async () => {
    await PATCH(createRequest({ site: [{ key: "", value: "ignored" }] }));

    expect(prisma.siteSetting.upsert).not.toHaveBeenCalled();
  });

  it("defaults the ip to 127.0.0.1 when x-forwarded-for is absent", async () => {
    const request = { json: vi.fn().mockResolvedValue({ platform: [{ key: "app_url", value: "https://y.com" }] }), headers: new Headers() } as unknown as NextRequest;

    await PATCH(request);

    expect(logActivity).toHaveBeenCalledWith(
      "UPDATE_PLATFORM_SETTING", "admin-1", "SYSTEM", "app_url",
      expect.objectContaining({ ip: "127.0.0.1" }),
      expect.anything(),
    );
  });

  it("returns 500 on an unexpected error", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("tx failed"));

    const response = await PATCH(createRequest({ site: [{ key: "site_title", value: "x" }] }));
    expect(response.status).toBe(500);
  });
});
