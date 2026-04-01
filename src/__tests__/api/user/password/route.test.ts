import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  verifyAccessToken: vi.fn(),
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  parseExpiryToSeconds: vi.fn().mockReturnValue(900),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    platformSetting: {
      findUnique: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
});

import { PATCH } from "@/app/api/user/password/route";
import { cookies } from "next/headers";
import { verifyAccessToken, generateAccessToken, generateRefreshToken } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const mockCookies = vi.mocked(cookies);
const mockVerifyAccessToken = vi.mocked(verifyAccessToken);
const mockGenerateAccessToken = vi.mocked(generateAccessToken);
const mockGenerateRefreshToken = vi.mocked(generateRefreshToken);
const mockCompare = vi.mocked(bcrypt.compare);
const mockHash = vi.mocked(bcrypt.hash);
const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockUpdate = vi.mocked(prisma.user.update);
const mockPlatformSettingFindUnique = vi.mocked(prisma.platformSetting.findUnique);

const createRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/user/password", {
    method: "PATCH",
    body: JSON.stringify(body),
  });

const setCookieToken = (token?: string) => {
  mockCookies.mockResolvedValue({
    get: vi.fn((name: string) => (name === "accessToken" && token ? { value: token } : undefined)),
  } as any);
};

describe("PATCH /api/user/password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlatformSettingFindUnique.mockResolvedValue({ key: "jwt_expiry", value: "15m" } as any);
  });

  it("returns 401 when token is missing", async () => {
    setCookieToken();

    const response = await PATCH(createRequest({ currentPassword: "x", newPassword: "12345678" }));

    expect(response.status).toBe(401);
  });

  it("returns 401 for invalid token", async () => {
    setCookieToken("bad");
    mockVerifyAccessToken.mockResolvedValue(null);

    const response = await PATCH(createRequest({ currentPassword: "x", newPassword: "12345678" }));

    expect(response.status).toBe(401);
  });

  it("returns 400 on validation failure", async () => {
    setCookieToken("ok");
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);

    const response = await PATCH(createRequest({ currentPassword: "", newPassword: "short" }));

    expect(response.status).toBe(400);
  });

  it("returns 404 when user has no password", async () => {
    setCookieToken("ok");
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockFindUnique.mockResolvedValue({ id: "u1", password: null } as any);

    const response = await PATCH(createRequest({ currentPassword: "x", newPassword: "12345678" }));

    expect(response.status).toBe(404);
  });

  it("returns 400 when current password is incorrect", async () => {
    setCookieToken("ok");
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockFindUnique.mockResolvedValue({ id: "u1", password: "hash" } as any);
    mockCompare.mockResolvedValue(false as any);

    const response = await PATCH(createRequest({ currentPassword: "x", newPassword: "12345678" }));

    expect(response.status).toBe(400);
  });

  it("updates password and rotates tokens on success", async () => {
    setCookieToken("ok");
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockFindUnique.mockResolvedValue({ id: "u1", password: "hash" } as any);
    mockCompare.mockResolvedValue(true as any);
    mockHash.mockResolvedValue("new_hash" as any);
    mockUpdate.mockResolvedValue({ id: "u1", role: { name: "REGISTERED_USER" }, tokenVersion: 2 } as any);
    mockGenerateAccessToken.mockReturnValue("new_access");
    mockGenerateRefreshToken.mockReturnValue("new_refresh");

    const response = await PATCH(createRequest({ currentPassword: "x", newPassword: "12345678" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Password updated successfully");
    expect(mockUpdate).toHaveBeenCalled();
    expect(response.cookies.get("accessToken")?.value).toBe("new_access");
    expect(response.cookies.get("refreshToken")?.value).toBe("new_refresh");
  });

  it("returns 500 on unexpected error", async () => {
    setCookieToken("ok");
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockFindUnique.mockRejectedValue(new Error("db down"));

    const response = await PATCH(createRequest({ currentPassword: "x", newPassword: "12345678" }));

    expect(response.status).toBe(500);
  });
});
