import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

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
  },
}));

import { DELETE, GET, PUT } from "@/app/api/admin/settings/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindUnique = vi.mocked(prisma.siteSetting.findUnique);
const mockFindMany = vi.mocked(prisma.siteSetting.findMany);
const mockUpsert = vi.mocked(prisma.siteSetting.upsert);
const mockDeleteMany = vi.mocked(prisma.siteSetting.deleteMany);

const createRequest = (url: string) => ({ nextUrl: new URL(url) }) as NextRequest;
const createJsonRequest = (url: string, body: unknown) =>
  ({ nextUrl: new URL(url), json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

describe("/api/admin/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 403 when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

    const response = await GET(createRequest("http://localhost/api/admin/settings"));

    expect(response.status).toBe(403);
  });

  it("GET returns single setting when key is provided", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue({ key: "auth_login_bg", value: "bg-1" } as any);

    const response = await GET(
      createRequest("http://localhost/api/admin/settings?key=auth_login_bg"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.setting.key).toBe("auth_login_bg");
  });

  it("GET returns all settings when key is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockResolvedValue([{ key: "k", value: "v" }] as any);

    const response = await GET(createRequest("http://localhost/api/admin/settings"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.settings).toHaveLength(1);
  });

  it("PUT returns 400 for invalid body", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    const response = await PUT(
      createJsonRequest("http://localhost/api/admin/settings", { key: "", value: "x" }),
    );

    expect(response.status).toBe(400);
  });

  it("PUT returns 403 when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

    const response = await PUT(
      createJsonRequest("http://localhost/api/admin/settings", { key: "k1", value: "v1" }),
    );

    expect(response.status).toBe(403);
  });

  it("PUT upserts setting", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockUpsert.mockResolvedValue({ key: "k1", value: "v1" } as any);

    const response = await PUT(
      createJsonRequest("http://localhost/api/admin/settings", { key: "k1", value: "v1" }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.setting.key).toBe("k1");
  });

  it("PUT returns 500 on upsert failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockUpsert.mockRejectedValue(new Error("db down"));

    const response = await PUT(
      createJsonRequest("http://localhost/api/admin/settings", { key: "k1", value: "v1" }),
    );

    expect(response.status).toBe(500);
  });

  it("DELETE returns 400 when key is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    const response = await DELETE(createRequest("http://localhost/api/admin/settings"));

    expect(response.status).toBe(400);
  });

  it("DELETE returns 403 when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

    const response = await DELETE(
      createRequest("http://localhost/api/admin/settings?key=auth_login_bg"),
    );

    expect(response.status).toBe(403);
  });

  it("DELETE removes setting by key", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockDeleteMany.mockResolvedValue({ count: 1 } as any);

    const response = await DELETE(
      createRequest("http://localhost/api/admin/settings?key=auth_login_bg"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { key: "auth_login_bg" } });
  });

  it("DELETE returns 500 on delete failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockDeleteMany.mockRejectedValue(new Error("db down"));

    const response = await DELETE(
      createRequest("http://localhost/api/admin/settings?key=auth_login_bg"),
    );

    expect(response.status).toBe(500);
  });

  it("GET returns 500 on fetch failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockRejectedValue(new Error("db down"));

    const response = await GET(createRequest("http://localhost/api/admin/settings"));

    expect(response.status).toBe(500);
  });
});
