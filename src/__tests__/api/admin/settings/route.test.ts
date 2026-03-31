import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

vi.mock("@/lib/api-auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    siteSetting: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    platformSetting: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn((promises) => Promise.all(promises)),
  },
}));

import { DELETE, GET, PUT } from "@/app/api/admin/settings/route";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockSiteFindUnique = vi.mocked(prisma.siteSetting.findUnique);
const mockSiteFindMany = vi.mocked(prisma.siteSetting.findMany);
const mockPlatformFindUnique = vi.mocked(prisma.platformSetting.findUnique);
const mockPlatformFindMany = vi.mocked(prisma.platformSetting.findMany);
const mockTransaction = vi.mocked(prisma.$transaction);
const mockSiteUpsert = vi.mocked(prisma.siteSetting.upsert);
const mockPlatformUpsert = vi.mocked(prisma.platformSetting.upsert);
const mockDeleteMany = vi.mocked(prisma.siteSetting.deleteMany);

const createRequest = (url: string) => new NextRequest(url);
const createJsonRequest = (url: string, body: unknown) =>
  new NextRequest(url, {
    method: "PUT",
    body: JSON.stringify(body),
  });

describe("/api/admin/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 403 when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

    const response = await GET(createRequest("http://localhost/api/admin/settings"));

    expect(response.status).toBe(403);
  });

  it("GET returns single setting from siteSetting if found", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockSiteFindUnique.mockResolvedValue({ key: "k1", value: "v1" } as any);

    const response = await GET(
      createRequest("http://localhost/api/admin/settings?key=k1"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.setting.key).toBe("k1");
    expect(mockPlatformFindUnique).not.toHaveBeenCalled();
  });

  it("GET returns single setting from platformSetting if siteSetting not found", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockSiteFindUnique.mockResolvedValue(null);
    mockPlatformFindUnique.mockResolvedValue({ key: "p1", value: "pv1" } as any);

    const response = await GET(
      createRequest("http://localhost/api/admin/settings?key=p1"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.setting.key).toBe("p1");
  });

  it("GET returns merged settings when key is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockSiteFindMany.mockResolvedValue([{ key: "site_k", value: "site_v" }] as any);
    mockPlatformFindMany.mockResolvedValue([{ key: "razorpay_mode", value: "test" }] as any);

    const response = await GET(createRequest("http://localhost/api/admin/settings"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.settings.site_k).toBe("site_v");
    expect(data.settings.razorpay_mode).toBe("test");
  });

  it("PUT returns 400 for invalid body format", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    const response = await PUT(
      createJsonRequest("http://localhost/api/admin/settings", { key: "x", value: "y" }),
    );

    expect(response.status).toBe(400);
  });

  it("PUT returns 403 when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

    const response = await PUT(
      createJsonRequest("http://localhost/api/admin/settings", { settings: { k: "v" } }),
    );

    expect(response.status).toBe(403);
  });

  it("PUT transactions multiple settings", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    
    // We mock transaction to return a resolved promise
    mockTransaction.mockResolvedValue([] as any);

    const response = await PUT(
      createJsonRequest("http://localhost/api/admin/settings", { 
        settings: { 
          "site_key": "val1", 
          "razorpay_mode": "live" 
        } 
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // Platform key 'razorpay_mode' should trigger platform upsert
    expect(mockPlatformUpsert).toHaveBeenCalled();
    // Site key 'site_key' should trigger site upsert
    expect(mockSiteUpsert).toHaveBeenCalled();
  });

  it("PUT returns 500 on transaction failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockTransaction.mockRejectedValue(new Error("db error"));

    const response = await PUT(
      createJsonRequest("http://localhost/api/admin/settings", { settings: { k: "v" } }),
    );

    expect(response.status).toBe(500);
  });

  it("DELETE returns 400 when key is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    const response = await DELETE(createRequest("http://localhost/api/admin/settings"));

    expect(response.status).toBe(400);
  });

  it("DELETE removes site setting by key", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockDeleteMany.mockResolvedValue({ count: 1 } as any);

    const response = await DELETE(
      createRequest("http://localhost/api/admin/settings?key=test_setting"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { key: "test_setting" } });
  });

  it("GET returns 500 on unexpected fetch failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockSiteFindMany.mockRejectedValue(new Error("unexpected crash"));

    const response = await GET(createRequest("http://localhost/api/admin/settings"));

    expect(response.status).toBe(500);
  });
});
