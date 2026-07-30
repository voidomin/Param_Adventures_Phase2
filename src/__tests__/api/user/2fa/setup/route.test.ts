import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock("@/lib/two-factor", () => ({
  generateTwoFactorSecret: vi.fn(),
  generateBackupCodes: vi.fn(),
}));

import { POST } from "@/app/api/user/2fa/setup/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { generateTwoFactorSecret, generateBackupCodes } from "@/lib/two-factor";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockUpdate = vi.mocked(prisma.user.update);
const mockGenerateTwoFactorSecret = vi.mocked(generateTwoFactorSecret);
const mockGenerateBackupCodes = vi.mocked(generateBackupCodes);

const createRequest = () => ({} as unknown as NextRequest);

describe("POST /api/user/2fa/setup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue({} as any);
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await POST(createRequest());
    expect(response.status).toBe(401);
  });

  it("returns 409 if 2FA is already enabled", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUnique.mockResolvedValue({ id: "u1", email: "user@example.com", twoFactorEnabled: true } as any);

    const response = await POST(createRequest());
    expect(response.status).toBe(409);
  });

  it("generates and stores a pending secret and backup codes", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUnique.mockResolvedValue({ id: "u1", email: "user@example.com", twoFactorEnabled: false } as any);
    mockGenerateTwoFactorSecret.mockResolvedValue({
      plainSecret: "SECRET",
      encryptedSecret: "enc-secret",
      provisioningUri: "otpauth://totp/...",
      qrCodeDataUrl: "data:image/png;base64,abc",
    });
    mockGenerateBackupCodes.mockReturnValue({
      plainCodes: ["AAAA111111"],
      hashedCodes: ["hash1"],
    });

    const response = await POST(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.secret).toBe("SECRET");
    expect(data.backupCodes).toEqual(["AAAA111111"]);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: {
        twoFactorSecret: "enc-secret",
        twoFactorBackupCodes: ["hash1"],
        twoFactorEnabled: false,
      },
    });
  });
});
