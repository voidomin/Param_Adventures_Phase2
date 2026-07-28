import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    siteSetting: {
      findMany: vi.fn(),
    },
    platformSetting: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/settings/public/route";
import { prisma } from "@/lib/db";

const mockSiteSettingFindMany = vi.mocked(prisma.siteSetting.findMany);
const mockPlatformSettingFindMany = vi.mocked(prisma.platformSetting.findMany);
const mockPlatformSettingFindUnique = vi.mocked(prisma.platformSetting.findUnique);

describe("GET /api/settings/public", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSiteSettingFindMany.mockResolvedValue([]);
    mockPlatformSettingFindMany.mockResolvedValue([]);
    mockPlatformSettingFindUnique.mockResolvedValue(null);
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
  });

  it("returns empty public keys when nothing is configured", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.google_client_id).toBe("");
    expect(data.turnstile_site_key).toBe("");
  });

  it("returns the admin-configured public keys", async () => {
    mockPlatformSettingFindUnique.mockImplementation(((({ where }: any) => {
      const values: Record<string, string> = {
        google_client_id: "db-google-client-id",
        turnstile_site_key: "db-turnstile-site-key",
      };
      const value = values[where.key];
      return Promise.resolve(value ? ({ key: where.key, value } as any) : null);
    }) as any));

    const response = await GET();
    const data = await response.json();

    expect(data.google_client_id).toBe("db-google-client-id");
    expect(data.turnstile_site_key).toBe("db-turnstile-site-key");
  });

  it("falls back to env vars when the admin settings are unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "env-google-client-id");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "env-turnstile-site-key");

    const response = await GET();
    const data = await response.json();

    expect(data.google_client_id).toBe("env-google-client-id");
    expect(data.turnstile_site_key).toBe("env-turnstile-site-key");
  });

  it("returns 500 on unexpected error", async () => {
    mockSiteSettingFindMany.mockRejectedValue(new Error("db down"));
    const response = await GET();
    expect(response.status).toBe(500);
  });
});
