import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/auth/verify-email/route";
import { prisma } from "@/lib/db";

const mockFindFirst = vi.mocked(prisma.user.findFirst);
const mockUpdate = vi.mocked(prisma.user.update);

const createRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("POST /api/auth/verify-email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for a missing token", async () => {
    const response = await POST(createRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 401 for an invalid or expired token", async () => {
    mockFindFirst.mockResolvedValue(null);

    const response = await POST(createRequest({ token: "bad-token" }));
    expect(response.status).toBe(401);
  });

  it("verifies the email and clears the token", async () => {
    mockFindFirst.mockResolvedValue({ id: "u1", isVerified: false } as any);

    const response = await POST(createRequest({ token: "good-token" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("verified");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: {
        isVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      },
    });
  });

  it("returns 200 without re-updating when already verified", async () => {
    mockFindFirst.mockResolvedValue({ id: "u1", isVerified: true } as any);

    const response = await POST(createRequest({ token: "good-token" }));

    expect(response.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 500 on unexpected error", async () => {
    mockFindFirst.mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest({ token: "good-token" }));
    expect(response.status).toBe(500);
  });
});
