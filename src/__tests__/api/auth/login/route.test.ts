import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    platformSetting: {
      findMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/auth", () => ({
  verifyPassword: vi.fn(),
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  parseExpiryToSeconds: vi.fn().mockReturnValue(3600),
}));

vi.mock("@/lib/bootstrap", () => ({
  ensureBasicSettings: vi.fn().mockResolvedValue(undefined),
  ensureRoles: vi.fn().mockResolvedValue(undefined),
  emergencyAdminRecovery: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/two-factor", () => ({
  verifyTwoFactorToken: vi.fn(),
  consumeBackupCode: vi.fn(),
}));

vi.mock("@/lib/monitoring", () => ({
  logError: vi.fn(),
}));

import { POST } from "@/app/api/auth/login/route";
import { prisma } from "@/lib/db";
import {
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/auth";
import { verifyTwoFactorToken, consumeBackupCode } from "@/lib/two-factor";

const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockUpdate = vi.mocked(prisma.user.update);
const mockVerifyPassword = vi.mocked(verifyPassword);
const mockGenerateAccessToken = vi.mocked(generateAccessToken);
const mockGenerateRefreshToken = vi.mocked(generateRefreshToken);
const mockPlatformSettingFindMany = vi.mocked(prisma.platformSetting.findMany);
const mockVerifyTwoFactorToken = vi.mocked(verifyTwoFactorToken);
const mockConsumeBackupCode = vi.mocked(consumeBackupCode);

const createRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });

const TEST_PASSWORD = "pw"; // NOSONAR
const TEST_HASHED = "hashed"; // NOSONAR

const baseUser = {
  id: "u1",
  email: "user@example.com",
  name: "User",
  password: TEST_HASHED,
  status: "ACTIVE",
  tokenVersion: 1,
  role: { name: "CUSTOMER" },
  failedLoginAttempts: 0,
  lockedUntil: null,
  twoFactorEnabled: false,
  twoFactorSecret: null,
  twoFactorBackupCodes: [] as string[],
};

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlatformSettingFindMany.mockResolvedValue([
      { key: "jwt_expiry", value: "15m" },
      { key: "refresh_token_expiry", value: "7d" },
    ] as any);
    mockUpdate.mockResolvedValue({} as any);
  });

  it("returns 400 for invalid payload", async () => {
    const response = await POST(createRequest({ email: "bad", password: "" }));
    expect(response.status).toBe(400);
  });

  it("returns 401 when user is missing", async () => {
    mockFindUnique.mockResolvedValue(null);

    const response = await POST(
      createRequest({ email: "user@example.com", password: TEST_PASSWORD }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid email or password.");
  });

  it("returns 403 when account is suspended", async () => {
    mockFindUnique.mockResolvedValue({ ...baseUser, status: "SUSPENDED" } as any);

    const response = await POST(
      createRequest({ email: "user@example.com", password: TEST_PASSWORD }),
    );

    expect(response.status).toBe(403);
  });

  it("returns 403 when the account has been self-deleted (deletedAt set), even if status is still ACTIVE", async () => {
    mockFindUnique.mockResolvedValue({
      ...baseUser,
      email: "deleted-u1@deleted.paramadventures.in",
      name: "Deleted User",
      deletedAt: new Date(),
    } as any);

    const response = await POST(
      createRequest({ email: "deleted-u1@deleted.paramadventures.in", password: TEST_PASSWORD }),
    );

    expect(response.status).toBe(403);
  });

  it("returns 423 when the account is currently locked out", async () => {
    mockFindUnique.mockResolvedValue({
      ...baseUser,
      lockedUntil: new Date(Date.now() + 60_000),
    } as any);

    const response = await POST(
      createRequest({ email: "user@example.com", password: TEST_PASSWORD }),
    );
    const data = await response.json();

    expect(response.status).toBe(423);
    expect(data.error).toContain("temporarily locked");
    expect(mockVerifyPassword).not.toHaveBeenCalled();
  });

  it("logs in successfully once a past lockout has expired", async () => {
    mockFindUnique.mockResolvedValue({
      ...baseUser,
      lockedUntil: new Date(Date.now() - 60_000),
    } as any);
    mockVerifyPassword.mockResolvedValue(true);
    mockGenerateAccessToken.mockResolvedValue("access-1" as any);
    mockGenerateRefreshToken.mockResolvedValue("refresh-1" as any);

    const response = await POST(
      createRequest({ email: "user@example.com", password: TEST_PASSWORD }),
    );

    expect(response.status).toBe(200);
  });

  it("returns 401 when password verification fails and increments the failed-attempt counter", async () => {
    mockFindUnique.mockResolvedValue({ ...baseUser, failedLoginAttempts: 1 } as any);
    mockVerifyPassword.mockResolvedValue(false);

    const response = await POST(
      createRequest({ email: "user@example.com", password: TEST_PASSWORD }),
    );

    expect(response.status).toBe(401);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { failedLoginAttempts: 2, lockedUntil: null },
    });
  });

  it("locks the account after reaching the failed-attempt threshold", async () => {
    mockFindUnique.mockResolvedValue({ ...baseUser, failedLoginAttempts: 9 } as any);
    mockVerifyPassword.mockResolvedValue(false);

    const response = await POST(
      createRequest({ email: "user@example.com", password: TEST_PASSWORD }),
    );
    const data = await response.json();

    expect(response.status).toBe(423);
    expect(data.error).toContain("temporarily locked");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { failedLoginAttempts: 0, lockedUntil: expect.any(Date) },
    });
  });

  it("returns 200 with tokens and user on success", async () => {
    mockFindUnique.mockResolvedValue({ ...baseUser, tokenVersion: 3 } as any);
    mockVerifyPassword.mockResolvedValue(true);
    mockGenerateAccessToken.mockResolvedValue("access-1" as any);
    mockGenerateRefreshToken.mockResolvedValue("refresh-1" as any);

    const response = await POST(
      createRequest({ email: "USER@example.com", password: TEST_PASSWORD }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.id).toBe("u1");
    expect(data.accessToken).toBeUndefined();
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
      include: { role: true },
    });
    expect(response.headers.get("set-cookie")).toContain("accessToken=");
    expect(response.headers.get("set-cookie")).toContain("refreshToken=");
  });

  it("does not touch failedLoginAttempts/lockedUntil on success when there was nothing to clear", async () => {
    mockFindUnique.mockResolvedValue({ ...baseUser } as any);
    mockVerifyPassword.mockResolvedValue(true);
    mockGenerateAccessToken.mockResolvedValue("access-1" as any);
    mockGenerateRefreshToken.mockResolvedValue("refresh-1" as any);

    await POST(createRequest({ email: "user@example.com", password: TEST_PASSWORD }));

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  describe("two-factor authentication", () => {
    const twoFactorUser = {
      ...baseUser,
      twoFactorEnabled: true,
      twoFactorSecret: "encrypted-secret",
      twoFactorBackupCodes: ["hash1", "hash2"],
    };

    it("requests a TOTP code when 2FA is enabled and none was supplied", async () => {
      mockFindUnique.mockResolvedValue(twoFactorUser as any);
      mockVerifyPassword.mockResolvedValue(true);

      const response = await POST(
        createRequest({ email: "user@example.com", password: TEST_PASSWORD }),
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.requiresTwoFactor).toBe(true);
      expect(mockGenerateAccessToken).not.toHaveBeenCalled();
    });

    it("logs in when a valid TOTP code is supplied", async () => {
      mockFindUnique.mockResolvedValue(twoFactorUser as any);
      mockVerifyPassword.mockResolvedValue(true);
      mockVerifyTwoFactorToken.mockReturnValue(true);
      mockGenerateAccessToken.mockResolvedValue("access-1" as any);
      mockGenerateRefreshToken.mockResolvedValue("refresh-1" as any);

      const response = await POST(
        createRequest({ email: "user@example.com", password: TEST_PASSWORD, totpCode: "123456" }),
      );

      expect(response.status).toBe(200);
      expect(mockVerifyTwoFactorToken).toHaveBeenCalledWith("encrypted-secret", "123456");
    });

    it("rejects an invalid TOTP code and backup code", async () => {
      mockFindUnique.mockResolvedValue(twoFactorUser as any);
      mockVerifyPassword.mockResolvedValue(true);
      mockVerifyTwoFactorToken.mockReturnValue(false);
      mockConsumeBackupCode.mockReturnValue({ valid: false, remainingHashedCodes: twoFactorUser.twoFactorBackupCodes });

      const response = await POST(
        createRequest({ email: "user@example.com", password: TEST_PASSWORD, totpCode: "000000" }),
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.requiresTwoFactor).toBe(true);
    });

    it("logs in with a valid backup code and consumes it", async () => {
      mockFindUnique.mockResolvedValue(twoFactorUser as any);
      mockVerifyPassword.mockResolvedValue(true);
      mockVerifyTwoFactorToken.mockReturnValue(false);
      mockConsumeBackupCode.mockReturnValue({ valid: true, remainingHashedCodes: ["hash2"] });
      mockGenerateAccessToken.mockResolvedValue("access-1" as any);
      mockGenerateRefreshToken.mockResolvedValue("refresh-1" as any);

      const response = await POST(
        createRequest({ email: "user@example.com", password: TEST_PASSWORD, totpCode: "AABBCCDDEE" }),
      );

      expect(response.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: { twoFactorBackupCodes: ["hash2"] },
      });
    });
  });

  it("returns 429 when rate limit is exceeded", async () => {
    const { authLimiter } = await import("@/lib/rate-limiter");
    vi.mocked(authLimiter.check).mockReturnValueOnce({
      success: false,
      limit: 20,
      remaining: 0,
      reset: 0,
    });

    const response = await POST(
      createRequest({ email: "user@example.com", password: TEST_PASSWORD }),
    );
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe("Too many requests. Please try again later.");
  });

  it("returns 500 on unexpected error", async () => {
    mockFindUnique.mockRejectedValue(new Error("db down"));

    const response = await POST(
      createRequest({ email: "user@example.com", password: TEST_PASSWORD }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error.");
  });
});
