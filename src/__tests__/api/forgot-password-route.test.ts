import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("node:crypto", () => {
  const randomBytes = vi.fn();
  return {
    randomBytes,
    default: {
      randomBytes,
    },
  };
});

vi.mock("@/lib/email", () => ({
  sendResetPasswordEmail: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/auth/forgot-password/route";
import crypto from "node:crypto";
import { sendResetPasswordEmail } from "@/lib/email";
import { prisma } from "@/lib/db";

const mockRandomBytes = vi.mocked(crypto.randomBytes);
const mockSendResetPasswordEmail = vi.mocked(sendResetPasswordEmail);
const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockUpdate = vi.mocked(prisma.user.update);

const createRequest = (body: unknown, origin = "http://localhost:3000") =>
  ({
    json: vi.fn().mockResolvedValue(body),
    headers: {
      get: vi.fn((name: string) =>
        name.toLowerCase() === "origin" ? origin : null,
      ),
    },
  }) as unknown as NextRequest;

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid email", async () => {
    const response = await POST(createRequest({ email: "bad" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid email address");
  });

  it("returns generic success for unknown user", async () => {
    mockFindUnique.mockResolvedValue(null);

    const response = await POST(createRequest({ email: "nouser@example.com" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("If an account exists");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 for inactive user", async () => {
    mockFindUnique.mockResolvedValue({ id: "u1", status: "BANNED" } as any);

    const response = await POST(
      createRequest({ email: "blocked@example.com" }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Account is suspended or inactive.");
  });

  it("updates reset token and sends email for active user", async () => {
    mockRandomBytes.mockReturnValue({
      toString: vi.fn().mockReturnValue("token123"),
    } as any);
    mockFindUnique.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      name: "User",
      status: "ACTIVE",
    } as any);
    mockUpdate.mockResolvedValue({} as any);

    const response = await POST(
      createRequest({ email: "USER@example.com" }, "http://app.local"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("If an account exists");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
      }),
    );
    expect(mockSendResetPasswordEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        userEmail: "user@example.com",
        resetLink: "http://app.local/reset-password?token=token123",
      }),
    );
  });

  it("returns 500 on unexpected error", async () => {
    mockFindUnique.mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest({ email: "x@example.com" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error.");
  });
});
