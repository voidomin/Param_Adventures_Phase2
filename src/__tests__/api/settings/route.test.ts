import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    siteSetting: {
      findUnique: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/settings/route";
import { prisma } from "@/lib/db";

const mockFindUnique = vi.mocked(prisma.siteSetting.findUnique);

const createRequest = (url: string) =>
  ({
    nextUrl: new URL(url),
  }) as NextRequest;

describe("GET /api/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when key is missing", async () => {
    const response = await GET(createRequest("http://localhost/api/settings"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("key query parameter is required");
  });

  it("returns setting value and cache header", async () => {
    mockFindUnique.mockResolvedValue({
      key: "auth_login_bg",
      value: "bg-1",
    } as any);

    const response = await GET(
      createRequest("http://localhost/api/settings?key=auth_login_bg"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.value).toBe("bg-1");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("returns null when setting does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    const response = await GET(
      createRequest("http://localhost/api/settings?key=missing"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.value).toBeNull();
  });

  it("returns 500 on failure", async () => {
    mockFindUnique.mockRejectedValue(new Error("db down"));

    const response = await GET(
      createRequest("http://localhost/api/settings?key=auth_login_bg"),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch setting");
  });
});
