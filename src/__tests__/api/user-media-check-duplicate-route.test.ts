import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    image: {
      findFirst: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/user/media/check-duplicate/route";
import { verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

const mockVerifyAccessToken = vi.mocked(verifyAccessToken);
const mockFindFirst = vi.mocked(prisma.image.findFirst);

type ReqOpts = {
  token?: string;
  body?: unknown;
};

const createRequest = (opts: ReqOpts = {}) =>
  ({
    cookies: {
      get: vi.fn((name: string) =>
        name === "accessToken" && opts.token
          ? { value: opts.token }
          : undefined,
      ),
    },
    json: vi.fn().mockResolvedValue(opts.body ?? {}),
  }) as unknown as NextRequest;

describe("POST /api/user/media/check-duplicate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when token is missing", async () => {
    const response = await POST(createRequest({ body: { hash: "abc" } }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 401 for invalid token", async () => {
    mockVerifyAccessToken.mockResolvedValue(null);

    const response = await POST(
      createRequest({ token: "bad", body: { hash: "abc" } }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid token");
  });

  it("returns 400 for invalid request body", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);

    const response = await POST(
      createRequest({ token: "ok", body: { hash: "" } }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("hash is required");
  });

  it("returns existing metadata when duplicate exists", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockFindFirst.mockResolvedValue({
      id: "img-1",
      originalUrl: "https://cdn.example.com/img.jpg",
      type: "IMAGE",
    } as any);

    const response = await POST(
      createRequest({ token: "ok", body: { hash: "abc123" } }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      exists: true,
      id: "img-1",
      url: "https://cdn.example.com/img.jpg",
      type: "IMAGE",
    });
  });

  it("returns exists false when duplicate is not found", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockFindFirst.mockResolvedValue(null);

    const response = await POST(
      createRequest({ token: "ok", body: { hash: "abc123" } }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ exists: false });
  });

  it("returns 500 on unexpected failure", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockFindFirst.mockRejectedValue(new Error("db down"));

    const response = await POST(
      createRequest({ token: "ok", body: { hash: "abc123" } }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Duplicate check failed");
  });
});

