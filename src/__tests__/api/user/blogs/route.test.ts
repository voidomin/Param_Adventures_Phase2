import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock("@/lib/slugify", () => ({
  generateSlug: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    blog: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    booking: {
      findFirst: vi.fn(),
    },
  },
}));

import { GET, POST } from "@/app/api/user/blogs/route";
import { verifyAccessToken } from "@/lib/auth";
import { generateSlug } from "@/lib/slugify";
import { prisma } from "@/lib/db";

const mockVerifyAccessToken = vi.mocked(verifyAccessToken);
const mockGenerateSlug = vi.mocked(generateSlug);
const mockBlogFindMany = vi.mocked(prisma.blog.findMany);
const mockBlogFindFirst = vi.mocked(prisma.blog.findFirst);
const mockBlogFindUnique = vi.mocked(prisma.blog.findUnique);
const mockBlogCreate = vi.mocked(prisma.blog.create);
const mockBookingFindFirst = vi.mocked(prisma.booking.findFirst);

type ReqOpts = { token?: string; body?: unknown };
const createRequest = (opts: ReqOpts = {}) =>
  ({
    cookies: {
      get: vi.fn((name: string) => (name === "accessToken" && opts.token ? { value: opts.token } : undefined)),
    },
    json: vi.fn().mockResolvedValue(opts.body ?? {}),
  }) as unknown as NextRequest;

describe("/api/user/blogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 401 when token is missing", async () => {
    const response = await GET(createRequest());

    expect(response.status).toBe(401);
  });

  it("GET returns 401 for invalid token", async () => {
    mockVerifyAccessToken.mockResolvedValue(null);

    const response = await GET(createRequest({ token: "bad" }));

    expect(response.status).toBe(401);
  });

  it("GET returns blogs for authenticated user", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockBlogFindMany.mockResolvedValue([{ id: "b1", title: "Story" }] as any);

    const response = await GET(createRequest({ token: "ok" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.blogs).toHaveLength(1);
  });

  it("POST returns 400 on invalid payload", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);

    const response = await POST(createRequest({ token: "ok", body: { title: "" } }));

    expect(response.status).toBe(400);
  });

  it("POST returns 401 when token is missing", async () => {
    const response = await POST(
      createRequest({ body: { experienceId: "exp-1", title: "My Trip" } }),
    );

    expect(response.status).toBe(401);
  });

  it("POST returns 401 for invalid token", async () => {
    mockVerifyAccessToken.mockResolvedValue(null);

    const response = await POST(
      createRequest({
        token: "bad",
        body: { experienceId: "exp-1", title: "My Trip" },
      }),
    );

    expect(response.status).toBe(401);
  });

  it("POST returns 403 when completed booking is missing", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockBookingFindFirst.mockResolvedValue(null);

    const response = await POST(
      createRequest({
        token: "ok",
        body: { experienceId: "exp-1", title: "My Trip" },
      }),
    );

    expect(response.status).toBe(403);
  });

  it("POST returns 409 when blog already exists", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockBookingFindFirst.mockResolvedValue({ id: "bk-1" } as any);
    mockBlogFindFirst.mockResolvedValue({ id: "b1" } as any);

    const response = await POST(
      createRequest({ token: "ok", body: { experienceId: "exp-1", title: "My Trip" } }),
    );
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.blogId).toBe("b1");
  });

  it("POST creates blog with unique slug", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockBookingFindFirst.mockResolvedValue({ id: "bk-1" } as any);
    mockBlogFindFirst.mockResolvedValue(null);
    mockGenerateSlug.mockReturnValue("my-trip");
    mockBlogFindUnique.mockResolvedValueOnce({ id: "b-old" } as any).mockResolvedValueOnce(null);
    mockBlogCreate.mockResolvedValue({ id: "b2", slug: "my-trip-1" } as any);

    const response = await POST(
      createRequest({
        token: "ok",
        body: {
          experienceId: "exp-1",
          title: "My Trip",
          coverImageUrl: "https://img.example/cover.jpg",
          theme: "MODERN",
          authorSocials: { instagram: "@a" },
        },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.blog.id).toBe("b2");
    expect(mockBlogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "My Trip",
          slug: "my-trip-1",
          authorId: "u1",
          experienceId: "exp-1",
          status: "DRAFT",
        }),
      }),
    );
  });

  it("POST defaults optional fields when not provided", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockBookingFindFirst.mockResolvedValue({ id: "bk-1" } as any);
    mockBlogFindFirst.mockResolvedValue(null);
    mockGenerateSlug.mockReturnValue("my-trip");
    mockBlogFindUnique.mockResolvedValue(null);
    mockBlogCreate.mockResolvedValue({ id: "b3", slug: "my-trip" } as any);

    const response = await POST(
      createRequest({
        token: "ok",
        body: {
          experienceId: "exp-1",
          title: "  My Trip  ",
        },
      }),
    );

    expect(response.status).toBe(201);
    expect(mockBlogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "My Trip",
          coverImageUrl: null,
          theme: "CLASSIC",
          authorSocials: null,
        }),
      }),
    );
  });

  it("POST returns 500 when database throws", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockBookingFindFirst.mockRejectedValue(new Error("db down"));

    const response = await POST(
      createRequest({
        token: "ok",
        body: { experienceId: "exp-1", title: "My Trip" },
      }),
    );

    expect(response.status).toBe(500);
  });

  it("POST returns generic 500 message for non-Error throws", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockBookingFindFirst.mockRejectedValue(null as any);

    const response = await POST(
      createRequest({
        token: "ok",
        body: { experienceId: "exp-1", title: "My Trip" },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal Server Error");
  });
});
