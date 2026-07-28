import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  revokeSessionFromToken: vi.fn(),
}));

import { POST } from "@/app/api/auth/logout/route";
import { revokeSessionFromToken } from "@/lib/auth";

const mockRevoke = vi.mocked(revokeSessionFromToken);

const createRequest = (cookies?: Record<string, string>) => {
  const req = new NextRequest("http://localhost/api/auth/logout", { method: "POST" });
  if (cookies) {
    for (const [key, val] of Object.entries(cookies)) {
      req.cookies.set(key, val);
    }
  }
  return req;
};

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRevoke.mockResolvedValue(undefined);
  });

  it("revokes the session using the refresh token when present", async () => {
    const response = await POST(createRequest({ refreshToken: "rt", accessToken: "at" }));

    expect(mockRevoke).toHaveBeenCalledWith("rt");
    expect(response.status).toBe(200);
  });

  it("falls back to the access token when there's no refresh token", async () => {
    await POST(createRequest({ accessToken: "at" }));

    expect(mockRevoke).toHaveBeenCalledWith("at");
  });

  it("clears both cookies even when no tokens are present", async () => {
    const response = await POST(createRequest());

    expect(mockRevoke).toHaveBeenCalledWith(undefined);
    const setCookie = response.headers.get("set-cookie") || "";
    expect(setCookie).toContain("accessToken=");
    expect(setCookie).toContain("Max-Age=0");
  });
});
