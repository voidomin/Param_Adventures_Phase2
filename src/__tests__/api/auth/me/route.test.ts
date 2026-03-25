import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/auth/me/route";
import { verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

const mockVerifyAccessToken = vi.mocked(verifyAccessToken);
const mockFindUnique = vi.mocked(prisma.user.findUnique);

type ReqOpts = {
  authHeader?: string;
  cookieToken?: string;
};

const createRequest = (opts: ReqOpts = {}) =>
  ({
    headers: {
      get: vi.fn((name: string) =>
        name.toLowerCase() === "authorization"
          ? (opts.authHeader ?? null)
          : null,
      ),
    },
    cookies: {
      get: vi.fn((name: string) =>
        name === "accessToken" && opts.cookieToken
          ? { value: opts.cookieToken }
          : undefined,
      ),
    },
  }) as unknown as NextRequest;

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no token is present", async () => {
    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("No access token provided.");
  });

  it("returns 401 when token is invalid", async () => {
    mockVerifyAccessToken.mockResolvedValue(null);

    const response = await GET(
      createRequest({ authHeader: "Bearer bad-token" }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid or expired token.");
  });

  it("returns 404 when user does not exist", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockFindUnique.mockResolvedValue(null);

    const response = await GET(
      createRequest({ authHeader: "Bearer ok-token" }),
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found.");
  });

  it("returns 403 when user is not active", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockFindUnique.mockResolvedValue({
      id: "u1",
      deletedAt: null,
      status: "BANNED",
    } as any);

    const response = await GET(createRequest({ cookieToken: "cookie-token" }));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Account is suspended.");
  });

  it("returns user profile with flattened permissions on success", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockFindUnique.mockResolvedValue({
      id: "u1",
      email: "u1@example.com",
      name: "User One",
      phoneNumber: "9999999999",
      avatarUrl: null,
      gender: "Male",
      age: 29,
      bloodGroup: "O+",
      emergencyContactName: "Emergency",
      emergencyContactNumber: "8888888888",
      emergencyRelationship: "Sibling",
      isVerified: true,
      deletedAt: null,
      status: "ACTIVE",
      role: {
        name: "ADMIN",
        permissions: [
          { permission: { key: "user.read" } },
          { permission: { key: "user.write" } },
        ],
      },
    } as any);

    const response = await GET(
      createRequest({ authHeader: "Bearer ok-token" }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.id).toBe("u1");
    expect(data.user.permissions).toEqual(["user.read", "user.write"]);
  });

  it("returns 500 on unexpected error", async () => {
    mockVerifyAccessToken.mockRejectedValue(new Error("jwt parser crashed"));

    const response = await GET(createRequest({ authHeader: "Bearer boom" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error.");
  });
});

