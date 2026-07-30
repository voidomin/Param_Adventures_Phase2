import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    role: {
      findUnique: vi.fn(),
    },
    platformSetting: {
      findMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/auth", () => ({
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  parseExpiryToSeconds: vi.fn().mockReturnValue(3600),
}));
vi.mock("@/lib/google-auth", () => ({ verifyGoogleIdToken: vi.fn() }));
vi.mock("@/lib/two-factor", () => ({
  verifyTwoFactorToken: vi.fn(),
  consumeBackupCode: vi.fn(),
}));

import { POST } from "@/app/api/auth/google/route";
import { prisma } from "@/lib/db";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth";
import { verifyGoogleIdToken } from "@/lib/google-auth";

const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockUserUpdate = vi.mocked(prisma.user.update);
const mockUserCreate = vi.mocked(prisma.user.create);
const mockRoleFindUnique = vi.mocked(prisma.role.findUnique);
const mockPlatformSettingFindMany = vi.mocked(prisma.platformSetting.findMany);
const mockGenerateAccessToken = vi.mocked(generateAccessToken);
const mockGenerateRefreshToken = vi.mocked(generateRefreshToken);
const mockVerifyGoogleIdToken = vi.mocked(verifyGoogleIdToken);

const createRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/auth/google", {
    method: "POST",
    body: JSON.stringify(body),
  });

const baseUser = {
  id: "u1",
  email: "user@example.com",
  name: "User",
  status: "ACTIVE",
  tokenVersion: 1,
  role: { name: "CUSTOMER" },
  googleId: "google-123",
  deletedAt: null,
  lockedUntil: null,
  twoFactorEnabled: false,
  twoFactorSecret: null,
  twoFactorBackupCodes: [] as string[],
};

describe("POST /api/auth/google", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlatformSettingFindMany.mockResolvedValue([{ key: "session_lifetime_hrs", value: "24" }] as any);
    mockGenerateAccessToken.mockResolvedValue("access-1" as any);
    mockGenerateRefreshToken.mockResolvedValue("refresh-1" as any);
  });

  it("returns 400 for a missing credential", async () => {
    const response = await POST(createRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 401 for an invalid Google credential", async () => {
    mockVerifyGoogleIdToken.mockResolvedValue(null);

    const response = await POST(createRequest({ credential: "bad-token" }));
    expect(response.status).toBe(401);
  });

  it("logs in an existing user matched by googleId", async () => {
    mockVerifyGoogleIdToken.mockResolvedValue({
      googleId: "google-123",
      email: "user@example.com",
      emailVerified: true,
      name: "User",
    });
    mockUserFindUnique.mockResolvedValue(baseUser as any);

    const response = await POST(createRequest({ credential: "good-token" }));

    expect(response.status).toBe(200);
    expect(mockUserCreate).not.toHaveBeenCalled();
  });

  it("links an existing email-matched account instead of duplicating it", async () => {
    mockVerifyGoogleIdToken.mockResolvedValue({
      googleId: "google-new",
      email: "user@example.com",
      emailVerified: true,
      name: "User",
    });
    mockUserFindUnique
      .mockResolvedValueOnce(null) // no match by googleId
      .mockResolvedValueOnce({ ...baseUser, googleId: null, isVerified: false } as any); // match by email
    mockUserUpdate.mockResolvedValue({ ...baseUser, googleId: "google-new" } as any);

    const response = await POST(createRequest({ credential: "good-token" }));

    expect(response.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
        data: expect.objectContaining({ googleId: "google-new" }),
      }),
    );
    expect(mockUserCreate).not.toHaveBeenCalled();
  });

  it("creates a new, pre-verified user when no match exists", async () => {
    mockVerifyGoogleIdToken.mockResolvedValue({
      googleId: "google-brand-new",
      email: "new@example.com",
      emailVerified: true,
      name: "New Person",
    });
    mockUserFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    mockRoleFindUnique.mockResolvedValue({ id: "r1", name: "REGISTERED_USER" } as any);
    mockUserCreate.mockResolvedValue({ ...baseUser, id: "u2", email: "new@example.com" } as any);

    const response = await POST(createRequest({ credential: "good-token" }));

    expect(response.status).toBe(200);
    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "new@example.com",
          googleId: "google-brand-new",
          isVerified: true,
          termsVersion: expect.any(String),
          acceptedTermsAt: expect.any(Date),
        }),
      }),
    );
  });

  it("returns 403 for a suspended account", async () => {
    mockVerifyGoogleIdToken.mockResolvedValue({
      googleId: "google-123",
      email: "user@example.com",
      emailVerified: true,
      name: "User",
    });
    mockUserFindUnique.mockResolvedValue({ ...baseUser, status: "SUSPENDED" } as any);

    const response = await POST(createRequest({ credential: "good-token" }));
    expect(response.status).toBe(403);
  });

  it("requests a TOTP code when 2FA is enabled", async () => {
    mockVerifyGoogleIdToken.mockResolvedValue({
      googleId: "google-123",
      email: "user@example.com",
      emailVerified: true,
      name: "User",
    });
    mockUserFindUnique.mockResolvedValue({ ...baseUser, twoFactorEnabled: true, twoFactorSecret: "enc" } as any);

    const response = await POST(createRequest({ credential: "good-token" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.requiresTwoFactor).toBe(true);
    expect(mockGenerateAccessToken).not.toHaveBeenCalled();
  });

  it("returns 500 on unexpected error", async () => {
    mockVerifyGoogleIdToken.mockRejectedValue(new Error("network error"));

    const response = await POST(createRequest({ credential: "good-token" }));
    expect(response.status).toBe(500);
  });
});
