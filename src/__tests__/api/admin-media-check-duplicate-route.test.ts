import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    image: {
      findFirst: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/admin/media/check-duplicate/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindFirst = vi.mocked(prisma.image.findFirst);

type ReqOpts = {
  body?: unknown;
};

const createRequest = (opts: ReqOpts = {}) =>
  ({
    json: vi.fn().mockResolvedValue(opts.body ?? {}),
  }) as unknown as NextRequest;

describe("POST /api/admin/media/check-duplicate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

    const response = await POST(createRequest({ body: { hash: "abc123" } }));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid payload", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    const response = await POST(createRequest({ body: { hash: "" } }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("hash is required");
  });

  it("returns existing metadata when duplicate exists", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindFirst.mockResolvedValue({
      id: "img-1",
      originalUrl: "https://cdn.example.com/img.jpg",
      type: "IMAGE",
    } as any);

    const response = await POST(createRequest({ body: { hash: "abc123" } }));
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
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindFirst.mockResolvedValue(null);

    const response = await POST(createRequest({ body: { hash: "abc123" } }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ exists: false });
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindFirst.mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest({ body: { hash: "abc123" } }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Duplicate check failed");
  });
});
