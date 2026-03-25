import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));
vi.mock("@/lib/auth", () => ({
  verifyPassword: vi.fn(),
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
}));

import { POST } from "@/app/api/auth/login/route";
import { prisma } from "@/lib/db";
import {
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/auth";

const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockVerifyPassword = vi.mocked(verifyPassword);
const mockGenerateAccessToken = vi.mocked(generateAccessToken);
const mockGenerateRefreshToken = vi.mocked(generateRefreshToken);

const createRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid payload", async () => {
    const response = await POST(createRequest({ email: "bad", password: "" }));
    expect(response.status).toBe(400);
  });

  it("returns 401 when user is missing", async () => {
    mockFindUnique.mockResolvedValue(null);

    const response = await POST(
      createRequest({ email: "user@example.com", password: "pw" }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid email or password.");
  });

  it("returns 403 when account is suspended", async () => {
    mockFindUnique.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      name: "User",
      password: "hashed",
      status: "SUSPENDED",
      tokenVersion: 1,
      role: { name: "CUSTOMER" },
    } as any);

    const response = await POST(
      createRequest({ email: "user@example.com", password: "pw" }),
    );

    expect(response.status).toBe(403);
  });

  it("returns 401 when password verification fails", async () => {
    mockFindUnique.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      name: "User",
      password: "hashed",
      status: "ACTIVE",
      tokenVersion: 1,
      role: { name: "CUSTOMER" },
    } as any);
    mockVerifyPassword.mockResolvedValue(false);

    const response = await POST(
      createRequest({ email: "user@example.com", password: "pw" }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 200 with tokens and user on success", async () => {
    mockFindUnique.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      name: "User",
      password: "hashed",
      status: "ACTIVE",
      tokenVersion: 3,
      role: { name: "CUSTOMER" },
    } as any);
    mockVerifyPassword.mockResolvedValue(true);
    mockGenerateAccessToken.mockReturnValue("access-1" as any);
    mockGenerateRefreshToken.mockReturnValue("refresh-1" as any);

    const response = await POST(
      createRequest({ email: "USER@example.com", password: "pw" }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.id).toBe("u1");
    expect(data.accessToken).toBe("access-1");
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
      include: { role: true },
    });
    expect(response.headers.get("set-cookie")).toContain("accessToken=");
    expect(response.headers.get("set-cookie")).toContain("refreshToken=");
  });

  it("returns 500 on unexpected error", async () => {
    mockFindUnique.mockRejectedValue(new Error("db down"));

    const response = await POST(
      createRequest({ email: "user@example.com", password: "pw" }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error.");
  });
});
