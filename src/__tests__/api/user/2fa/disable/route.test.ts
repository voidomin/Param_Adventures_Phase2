import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyPassword: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock("@/lib/two-factor", () => ({
  verifyTwoFactorToken: vi.fn(),
  consumeBackupCode: vi.fn(),
}));

import { POST } from "@/app/api/user/2fa/disable/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { verifyTwoFactorToken, consumeBackupCode } from "@/lib/two-factor";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockUpdate = vi.mocked(prisma.user.update);
const mockVerifyPassword = vi.mocked(verifyPassword);
const mockVerifyTwoFactorToken = vi.mocked(verifyTwoFactorToken);
const mockConsumeBackupCode = vi.mocked(consumeBackupCode);

const createRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/user/2fa/disable", {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("POST /api/user/2fa/disable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue({} as any);
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await POST(createRequest({ password: "pw" }));
    expect(response.status).toBe(401);
  });

  it("returns 401 for an incorrect password on a password-based account", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUnique.mockResolvedValue({ id: "u1", password: "hashed", twoFactorBackupCodes: [] } as any);
    mockVerifyPassword.mockResolvedValue(false);

    const response = await POST(createRequest({ password: "wrong" }));
    expect(response.status).toBe(401);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("disables 2FA on a correct password", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUnique.mockResolvedValue({ id: "u1", password: "hashed", twoFactorBackupCodes: [] } as any);
    mockVerifyPassword.mockResolvedValue(true);

    const response = await POST(createRequest({ password: "correct" }));

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: [] },
    });
  });

  it("disables 2FA on a Google-only account (no password) via a valid TOTP code", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUnique.mockResolvedValue({ id: "u1", password: null, twoFactorSecret: "enc", twoFactorBackupCodes: [] } as any);
    mockVerifyTwoFactorToken.mockReturnValue(true);

    const response = await POST(createRequest({ code: "123456" }));

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("disables 2FA on a Google-only account via a valid backup code", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUnique.mockResolvedValue({ id: "u1", password: null, twoFactorSecret: "enc", twoFactorBackupCodes: ["hash1"] } as any);
    mockVerifyTwoFactorToken.mockReturnValue(false);
    mockConsumeBackupCode.mockReturnValue({ valid: true, remainingHashedCodes: [] });

    const response = await POST(createRequest({ code: "AAAA111111" }));
    expect(response.status).toBe(200);
  });

  it("rejects a Google-only account with no code and no password", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUnique.mockResolvedValue({ id: "u1", password: null, twoFactorSecret: "enc", twoFactorBackupCodes: [] } as any);

    const response = await POST(createRequest({}));
    expect(response.status).toBe(401);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when the user no longer exists", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUnique.mockResolvedValue(null);

    const response = await POST(createRequest({ password: "pw" }));
    expect(response.status).toBe(404);
  });
});
