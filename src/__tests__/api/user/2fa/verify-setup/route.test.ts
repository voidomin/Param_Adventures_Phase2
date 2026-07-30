import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock("@/lib/two-factor", () => ({ verifyTwoFactorToken: vi.fn() }));

import { POST } from "@/app/api/user/2fa/verify-setup/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { verifyTwoFactorToken } from "@/lib/two-factor";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockUpdate = vi.mocked(prisma.user.update);
const mockVerifyTwoFactorToken = vi.mocked(verifyTwoFactorToken);

const createRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/user/2fa/verify-setup", {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("POST /api/user/2fa/verify-setup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue({} as any);
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await POST(createRequest({ code: "123456" }));
    expect(response.status).toBe(401);
  });

  it("returns 400 for a missing code", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    const response = await POST(createRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 409 when there's no pending setup", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUnique.mockResolvedValue({ id: "u1", twoFactorSecret: null } as any);

    const response = await POST(createRequest({ code: "123456" }));
    expect(response.status).toBe(409);
  });

  it("returns 401 for an invalid code", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUnique.mockResolvedValue({ id: "u1", twoFactorSecret: "enc" } as any);
    mockVerifyTwoFactorToken.mockReturnValue(false);

    const response = await POST(createRequest({ code: "000000" }));
    expect(response.status).toBe(401);
  });

  it("enables 2FA on a valid code", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUnique.mockResolvedValue({ id: "u1", twoFactorSecret: "enc" } as any);
    mockVerifyTwoFactorToken.mockReturnValue(true);

    const response = await POST(createRequest({ code: "123456" }));

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { twoFactorEnabled: true },
    });
  });
});
