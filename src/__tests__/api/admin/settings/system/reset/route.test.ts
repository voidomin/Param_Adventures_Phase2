import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeSystemRequest: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/db", () => {
  const mockPrisma = {
    platformSetting: { deleteMany: vi.fn(), create: vi.fn() },
    siteSetting: { deleteMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  };
  mockPrisma.$transaction = vi.fn().mockImplementation(async (cb: any) => cb(mockPrisma));
  return { prisma: mockPrisma };
});

import { POST } from "@/app/api/admin/settings/system/reset/route";
import { authorizeSystemRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { prisma } from "@/lib/db";
import { DEFAULT_PLATFORM_SETTINGS, DEFAULT_SITE_SETTINGS } from "@/lib/constants/settings";

const mockAuthorizeSystemRequest = vi.mocked(authorizeSystemRequest);
const createRequest = (ip?: string) =>
  ({ headers: new Headers(ip ? { "x-forwarded-for": ip } : {}) }) as unknown as NextRequest;

describe("POST /api/admin/settings/system/reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma));
    mockAuthorizeSystemRequest.mockResolvedValue({ authorized: true, userId: "admin-1", roleName: "SUPER_ADMIN" } as any);
  });

  it("returns the auth response when unauthorized", async () => {
    mockAuthorizeSystemRequest.mockResolvedValue({ authorized: false, response: { status: 401 } } as any);

    const response = await POST(createRequest());
    expect((response as any).status).toBe(401);
  });

  it("wipes and restores all default platform and site settings, logging the reset", async () => {
    const response = await POST(createRequest("1.2.3.4"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("restored to defaults");
    expect(prisma.platformSetting.deleteMany).toHaveBeenCalledWith({});
    expect(prisma.siteSetting.deleteMany).toHaveBeenCalledWith({});
    expect(prisma.platformSetting.create).toHaveBeenCalledTimes(DEFAULT_PLATFORM_SETTINGS.length);
    expect(prisma.siteSetting.create).toHaveBeenCalledTimes(DEFAULT_SITE_SETTINGS.length);
    expect(logActivity).toHaveBeenCalledWith(
      "SYSTEM_FACTORY_RESET", "admin-1", "SYSTEM", "ALL",
      expect.objectContaining({ ip: "1.2.3.4" }),
      expect.anything(),
    );
  });

  it("defaults the ip to 127.0.0.1 when x-forwarded-for is absent", async () => {
    await POST(createRequest());

    expect(logActivity).toHaveBeenCalledWith(
      "SYSTEM_FACTORY_RESET", "admin-1", "SYSTEM", "ALL",
      expect.objectContaining({ ip: "127.0.0.1" }),
      expect.anything(),
    );
  });

  it("returns 500 on an unexpected error", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("tx failed"));

    const response = await POST(createRequest());
    expect(response.status).toBe(500);
  });
});
