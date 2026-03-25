import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    siteSetting: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/settings/auth/route";
import { prisma } from "@/lib/db";

const mockFindMany = vi.mocked(prisma.siteSetting.findMany);

describe("GET /api/settings/auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mapped key-value settings with cache-control header", async () => {
    mockFindMany.mockResolvedValue([
      { key: "auth_common_tagline", value: "Plan. Trek. Repeat." },
      { key: "auth_login_form_heading", value: "Welcome Back" },
    ] as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.settings).toEqual({
      auth_common_tagline: "Plan. Trek. Repeat.",
      auth_login_form_heading: "Welcome Back",
    });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(mockFindMany).toHaveBeenCalledOnce();
  });

  it("returns 500 when site settings fetch fails", async () => {
    mockFindMany.mockRejectedValue(new Error("db down"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch auth settings");
  });
});
