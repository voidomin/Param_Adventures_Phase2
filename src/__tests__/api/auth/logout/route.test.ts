import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  revokeSessionFromToken: vi.fn(),
  getUserIdFromToken: vi.fn(),
}));
vi.mock("@/lib/audit-logger", () => ({
  logActivity: vi.fn(),
}));

import { POST } from "@/app/api/auth/logout/route";
import { revokeSessionFromToken, getUserIdFromToken } from "@/lib/auth";
import { logActivity } from "@/lib/audit-logger";

const mockRevoke = vi.mocked(revokeSessionFromToken);
const mockGetUserId = vi.mocked(getUserIdFromToken);
const mockLogActivity = vi.mocked(logActivity);

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
    mockGetUserId.mockResolvedValue(null);
  });

  it("revokes the session using the refresh token when present", async () => {
    const response = await POST(createRequest({ refreshToken: "rt", accessToken: "at" }));

    expect(mockRevoke).toHaveBeenCalledWith("rt");
    expect(response.status).toBe(200);
  });

  it("audit-logs the logout when the token identifies a user", async () => {
    mockGetUserId.mockResolvedValue("user-1");

    await POST(createRequest({ refreshToken: "rt" }));

    expect(mockLogActivity).toHaveBeenCalledWith("LOGOUT", "user-1", "User", "user-1");
  });

  it("skips audit-logging when the token doesn't identify a user", async () => {
    mockGetUserId.mockResolvedValue(null);

    await POST(createRequest());

    expect(mockLogActivity).not.toHaveBeenCalled();
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
