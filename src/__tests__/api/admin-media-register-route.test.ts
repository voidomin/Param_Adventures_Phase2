import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    image: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/admin/media/register/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindFirst = vi.mocked(prisma.image.findFirst);
const mockCreate = vi.mocked(prisma.image.create);

type ReqOpts = {
  body?: unknown;
};

const createRequest = (opts: ReqOpts = {}) =>
  ({
    json: vi.fn().mockResolvedValue(opts.body ?? {}),
  }) as unknown as NextRequest;

describe("POST /api/admin/media/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

    const response = await POST(createRequest());
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid payload", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    const response = await POST(
      createRequest({ body: { url: "bad-url", type: "IMAGE" } }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("url must be a valid URL");
  });

  it("returns existing media when duplicate hash exists", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      userId: "admin-1",
    } as any);
    mockFindFirst.mockResolvedValue({
      id: "img-1",
      originalUrl: "https://cdn.example.com/1.jpg",
      type: "IMAGE",
    } as any);

    const response = await POST(
      createRequest({
        body: {
          url: "https://cdn.example.com/1.jpg",
          type: "IMAGE",
          hash: "abc123",
        },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      id: "img-1",
      url: "https://cdn.example.com/1.jpg",
      type: "IMAGE",
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates IMAGE media with null hash when hash is omitted", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      userId: "admin-1",
    } as any);
    mockCreate.mockResolvedValue({
      id: "img-2",
      originalUrl: "https://cdn.example.com/2.jpg",
      type: "IMAGE",
    } as any);

    const response = await POST(
      createRequest({
        body: {
          url: "https://cdn.example.com/2.jpg",
          type: "IMAGE",
        },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("img-2");
    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        originalUrl: "https://cdn.example.com/2.jpg",
        type: "IMAGE",
        uploadedById: "admin-1",
        fileHash: null,
      },
    });
  });

  it("creates VIDEO media when type is VIDEO", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      userId: "admin-1",
    } as any);
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "vid-1",
      originalUrl: "https://cdn.example.com/2.mp4",
      type: "VIDEO",
    } as any);

    const response = await POST(
      createRequest({
        body: {
          url: "https://cdn.example.com/2.mp4",
          type: "VIDEO",
          hash: "hash-1",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        originalUrl: "https://cdn.example.com/2.mp4",
        type: "VIDEO",
        uploadedById: "admin-1",
        fileHash: "hash-1",
      },
    });
  });

  it("returns 500 on unexpected failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindFirst.mockRejectedValue(new Error("db down"));

    const response = await POST(
      createRequest({
        body: {
          url: "https://cdn.example.com/3.jpg",
          type: "IMAGE",
          hash: "abc",
        },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to register media. Please try again.");
  });
});
