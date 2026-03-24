import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../app/api/auth/login/route";
import { prisma } from "../lib/db";
import { verifyPassword, generateAccessToken, generateRefreshToken } from "../lib/auth";
import { NextRequest } from "next/server";

vi.mock("../lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../lib/auth", () => ({
  verifyPassword: vi.fn(),
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
}));

const MOCK_PASSWORD = "dummy-Pass-123";
const WRONG_PASSWORD = "incorrect-Pass";

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: any) => {
    return {
      json: vi.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  };

  it("returns 400 for invalid input", async () => {
    const req = createRequest({ email: "invalid-email", password: "" });
    const response = await POST(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid email format");
  });

  it("returns 401 if user not found", async () => {
    const req = createRequest({ email: "test@example.com", password: MOCK_PASSWORD });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("returns 403 if user is not active", async () => {
    const req = createRequest({ email: "test@example.com", password: MOCK_PASSWORD });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      status: "BANNED",
      password: "hashed",
    } as any);

    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it("returns 401 if password is wrong", async () => {
    const req = createRequest({ email: "test@example.com", password: WRONG_PASSWORD });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      status: "ACTIVE",
      password: "hashed",
    } as any);
    vi.mocked(verifyPassword).mockResolvedValue(false);

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("successfully logs in and sets cookies", async () => {
    const req = createRequest({ email: "test@example.com", password: MOCK_PASSWORD });
    const user = {
      id: "u1",
      email: "test@example.com",
      name: "Test User",
      password: "hashed",
      status: "ACTIVE",
      tokenVersion: 1,
      role: { name: "USER" },
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any);
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(generateAccessToken).mockReturnValue("access");
    vi.mocked(generateRefreshToken).mockReturnValue("refresh");

    const response = await POST(req);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.accessToken).toBe("access");
    expect(data.user.name).toBe("Test User");

    // Check cookies (since it's a mocked NextRequest/Response, we check if set was called if we mocked it)
    // Actually NEXT Response has a .cookies property.
    expect(response.cookies.get("accessToken")?.value).toBe("access");
    expect(response.cookies.get("refreshToken")?.value).toBe("refresh");
  });

  it("returns 500 on internal error", async () => {
    const req = createRequest({ email: "test@example.com", password: MOCK_PASSWORD });
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error("DB error"));

    const response = await POST(req);
    expect(response.status).toBe(500);
  });
});
