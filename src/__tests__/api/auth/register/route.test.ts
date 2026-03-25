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
  },
}));
vi.mock("@/lib/auth", () => ({
  hashPassword: vi.fn(),
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
}));
vi.mock("@/lib/email", () => ({
  sendWelcomeEmail: vi.fn(() => Promise.resolve()),
}));

import { POST } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/db";
import {
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";

const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockUserCreate = vi.mocked(prisma.user.create);
const mockRoleFindUnique = vi.mocked(prisma.role.findUnique);
const mockHashPassword = vi.mocked(hashPassword);
const mockGenerateAccessToken = vi.mocked(generateAccessToken);
const mockGenerateRefreshToken = vi.mocked(generateRefreshToken);
const mockSendWelcomeEmail = vi.mocked(sendWelcomeEmail);

const createRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid payload", async () => {
    const response = await POST(
      createRequest({ email: "bad", password: "123", name: "" }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 409 when user already exists", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "u1" } as any);

    const response = await POST(
      createRequest({ email: "user@example.com", password: "password1", name: "User" }),
    );

    expect(response.status).toBe(409);
  });

  it("returns 500 when default role is missing", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockRoleFindUnique.mockResolvedValue(null);

    const response = await POST(
      createRequest({ email: "user@example.com", password: "password1", name: "User" }),
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
    mockGenerateAccessToken.mockReturnValue("access-1" as any);
    mockGenerateRefreshToken.mockReturnValue("refresh-1" as any);

    const response = await POST(
      createRequest({ email: "USER@EXAMPLE.COM", password: "password1", name: "  User  " }),
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.user.id).toBe("u1");
    expect(data.accessToken).toBe("access-1");
    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "user@example.com",
          name: "User",
          password: "hashed-1",
          roleId: "r1",
        }),
      }),
    );
    expect(mockSendWelcomeEmail).toHaveBeenCalledWith({
      userName: "User",
      userEmail: "user@example.com",
    });
    expect(response.headers.get("set-cookie")).toContain("accessToken=");
    expect(response.headers.get("set-cookie")).toContain("refreshToken=");
  });

  it("returns 500 on unexpected error", async () => {
    mockUserFindUnique.mockRejectedValue(new Error("db down"));

    const response = await POST(
      createRequest({ email: "user@example.com", password: "password1", name: "User" }),
    );

    expect(response.status).toBe(500);
  });
});
