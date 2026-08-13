import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
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
vi.mock("@/lib/email", () => ({
  sendVerificationEmail: vi.fn(() => Promise.resolve()),
}));

import { POST } from "@/app/api/auth/resend-verification/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockUpdate = vi.mocked(prisma.user.update);
const mockPlatformSettingFindMany = vi.mocked(prisma.platformSetting.findMany);
const mockSendVerificationEmail = vi.mocked(sendVerificationEmail);

const createRequest = () => new NextRequest("http://localhost/api/auth/resend-verification", { method: "POST" });

describe("POST /api/auth/resend-verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlatformSettingFindMany.mockResolvedValue([{ key: "app_url", value: "https://example.com" }] as any);
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

  it("returns 404 when user is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUnique.mockResolvedValue(null);

    const response = await POST(createRequest());
    expect(response.status).toBe(404);
  });

  it("returns 200 without sending when already verified", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUnique.mockResolvedValue({ id: "u1", isVerified: true } as any);

    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    expect(mockSendVerificationEmail).not.toHaveBeenCalled();
  });

  it("generates a new token and sends the verification email", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUnique.mockResolvedValue({ id: "u1", email: "user@example.com", name: "User", isVerified: false } as any);

    const response = await POST(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("sent");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: {
        emailVerificationToken: expect.any(String),
        emailVerificationTokenExpiry: expect.any(Date),
      },
    });
    expect(mockSendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ userEmail: "user@example.com" }),
    );
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindUnique.mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest());
    expect(response.status).toBe(500);
  });
});
