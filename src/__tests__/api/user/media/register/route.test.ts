import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    image: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/user/media/register/route";
import { verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

const mockVerifyAccessToken = vi.mocked(verifyAccessToken);
const mockFindFirst = vi.mocked(prisma.image.findFirst);
const mockCreate = vi.mocked(prisma.image.create);

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

describe("POST /api/user/media/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when token is missing", async () => {
    const response = await POST(
      createRequest({ body: { url: "https://x.com/img.jpg", type: "IMAGE" } }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 401 for invalid token", async () => {
    mockVerifyAccessToken.mockResolvedValue(null);

    const response = await POST(
      createRequest({
        token: "bad",
        body: { url: "https://x.com/img.jpg", type: "IMAGE" },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid token");
  });

  it("returns 400 for invalid body", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);

    const response = await POST(
      createRequest({ token: "ok", body: { url: "bad-url", type: "IMAGE" } }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("url must be a valid URL");
  });

  it("returns existing image when hash duplicate is found", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockFindFirst.mockResolvedValue({
      id: "img-1",
      originalUrl: "https://x.com/img.jpg",
      type: "IMAGE",
    } as any);

    const response = await POST(
      createRequest({
        token: "ok",
        body: { url: "https://x.com/img.jpg", type: "IMAGE", hash: "abc123" },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.image.id).toBe("img-1");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates image and returns 201 when no duplicate exists", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "img-new" } as any);

    const response = await POST(
      createRequest({
        token: "ok",
        body: { url: "https://x.com/video.mp4", type: "VIDEO", hash: "abc123" },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.image.id).toBe("img-new");
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        originalUrl: "https://x.com/video.mp4",
        type: "VIDEO",
        uploadedById: "u1",
        fileHash: "abc123",
      },
    });
  });

  it("creates IMAGE media with null hash when hash is not provided", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockCreate.mockResolvedValue({ id: "img-nohash" } as any);

    const response = await POST(
      createRequest({
        token: "ok",
        body: { url: "https://x.com/img.jpg", type: "IMAGE" },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.image.id).toBe("img-nohash");
    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        originalUrl: "https://x.com/img.jpg",
        type: "IMAGE",
        uploadedById: "u1",
        fileHash: null,
      },
    });
  });

  it("returns 500 on unexpected error", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockFindFirst.mockRejectedValue(new Error("db down"));

    const response = await POST(
      createRequest({
        token: "ok",
        body: { url: "https://x.com/img.jpg", type: "IMAGE", hash: "abc123" },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to register media");
  });
});

