import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    role: {
      findUnique: vi.fn(),
    },
    platformSetting: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    siteSetting: {
      findMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/auth", () => ({
  hashPassword: vi.fn(),
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  parseExpiryToSeconds: vi.fn().mockReturnValue(3600),
}));
vi.mock("@/lib/email", () => ({
  sendWelcomeEmail: vi.fn(() => Promise.resolve()),
  sendVerificationEmail: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn(() => Promise.resolve(true)),
}));

import { POST } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/db";
import {
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/auth";
import { sendWelcomeEmail, sendVerificationEmail } from "@/lib/email";
import { verifyTurnstileToken } from "@/lib/turnstile";

const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockUserCreate = vi.mocked(prisma.user.create);
const mockRoleFindUnique = vi.mocked(prisma.role.findUnique);
const mockHashPassword = vi.mocked(hashPassword);
const mockGenerateAccessToken = vi.mocked(generateAccessToken);
const mockGenerateRefreshToken = vi.mocked(generateRefreshToken);
const mockSendWelcomeEmail = vi.mocked(sendWelcomeEmail);
const mockSendVerificationEmail = vi.mocked(sendVerificationEmail);
const mockPlatformSettingFindUnique = vi.mocked(prisma.platformSetting.findUnique);
const mockPlatformSettingFindMany = vi.mocked(prisma.platformSetting.findMany);
const mockSiteSettingFindMany = vi.mocked(prisma.siteSetting.findMany);
const mockVerifyTurnstileToken = vi.mocked(verifyTurnstileToken);

const createRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlatformSettingFindUnique.mockResolvedValue({ key: "registration_enabled", value: "true" } as any);
    mockPlatformSettingFindMany.mockImplementation(((args: any) => {
      if (args?.where?.key === "app_url") {
        return Promise.resolve([{ key: "app_url", value: "https://example.com" }]);
      }
      return Promise.resolve([
        { key: "jwt_expiry", value: "1h" },
        { key: "refresh_token_expiry", value: "7d" },
      ]);
    }) as any);
    mockSiteSettingFindMany.mockResolvedValue([] as any);
    mockVerifyTurnstileToken.mockResolvedValue(true);
  });

  it("returns 400 for invalid payload", async () => {
    const response = await POST(
      createRequest({ email: "bad", password: "123", name: "" }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when terms are not accepted", async () => {
    const response = await POST(
      createRequest({ email: "user@example.com", password: "Password1", name: "User", acceptedTerms: false }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Terms");
  });

  it("returns 409 when user already exists", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "u1" } as any);

    const response = await POST(
      createRequest({ email: "user@example.com", password: "Password1", name: "User", acceptedTerms: true }),
    );

    expect(response.status).toBe(409);
  });

  it("returns 500 when default role is missing", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockRoleFindUnique.mockResolvedValue(null);

    const response = await POST(
      createRequest({ email: "user@example.com", password: "Password1", name: "User", acceptedTerms: true }),
    );

    expect(response.status).toBe(500);
  });

  it("returns 201 and sets cookies on success", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockRoleFindUnique.mockResolvedValue({ id: "r1", name: "REGISTERED_USER" } as any);
    mockHashPassword.mockResolvedValue("hashed-1");
    mockUserCreate.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      name: "User",
      tokenVersion: 2,
      role: { name: "REGISTERED_USER" },
    } as any);
    mockGenerateAccessToken.mockResolvedValue("access-1" as any);
    mockGenerateRefreshToken.mockResolvedValue("refresh-1" as any);

    const response = await POST(
      createRequest({ email: "USER@EXAMPLE.COM", password: "Password1", name: "  User  ", acceptedTerms: true }),
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.user.id).toBe("u1");
    expect(data.accessToken).toBeUndefined();
    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "user@example.com",
          name: "User",
          password: "hashed-1",
          roleId: "r1",
          emailVerificationToken: expect.any(String),
          emailVerificationTokenExpiry: expect.any(Date),
          termsVersion: expect.any(String),
          acceptedTermsAt: expect.any(Date),
        }),
      }),
    );
    expect(mockSendWelcomeEmail).toHaveBeenCalledWith({
      userName: "User",
      userEmail: "user@example.com",
    });
    expect(mockSendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        userName: "User",
        userEmail: "user@example.com",
        verifyLink: expect.stringContaining("https://example.com/verify-email?token="),
      }),
    );
    expect(response.headers.get("set-cookie")).toContain("accessToken=");
    expect(response.headers.get("set-cookie")).toContain("refreshToken=");
  });

  it("returns 400 when the bot-protection check fails", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockVerifyTurnstileToken.mockResolvedValue(false);

    const response = await POST(
      createRequest({ email: "user@example.com", password: "Password1", name: "User", acceptedTerms: true }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("bot-protection");
    expect(mockUserCreate).not.toHaveBeenCalled();
  });

  it("returns 500 on unexpected error", async () => {
    mockUserFindUnique.mockRejectedValue(new Error("db down"));

    const response = await POST(
      createRequest({ email: "user@example.com", password: "Password1", name: "User", acceptedTerms: true }),
    );

    expect(response.status).toBe(500);
  });
});
