import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyAccessToken: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    blog: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { POST } from "@/app/api/user/blogs/[id]/submit/route";
import { revalidatePath } from "next/cache";
import { verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

const mockRevalidatePath = vi.mocked(revalidatePath);
const mockVerifyAccessToken = vi.mocked(verifyAccessToken);
const mockBlogFindUnique = vi.mocked(prisma.blog.findUnique);
const mockBlogUpdate = vi.mocked(prisma.blog.update);

type ReqOpts = { token?: string };

const createRequest = (opts: ReqOpts = {}) =>
  ({
    cookies: {
      get: vi.fn((name: string) =>
        name === "accessToken" && opts.token
          ? { value: opts.token }
          : undefined,
      ),
    },
  }) as unknown as NextRequest;

describe("POST /api/user/blogs/[id]/submit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when token missing", async () => {
    const response = await POST(createRequest(), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 401 when token invalid", async () => {
    mockVerifyAccessToken.mockResolvedValue(null);

    const response = await POST(createRequest({ token: "bad" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 when blog missing", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockBlogFindUnique.mockResolvedValue(null);

    const response = await POST(createRequest({ token: "ok" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 403 when blog belongs to another author", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockBlogFindUnique.mockResolvedValue({
      id: "b1",
      authorId: "u2",
      status: "DRAFT",
    } as any);

    const response = await POST(createRequest({ token: "ok" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns 400 when blog is not draft", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockBlogFindUnique.mockResolvedValue({
      id: "b1",
      authorId: "u1",
      status: "PENDING_REVIEW",
      title: "X",
      content: { content: [{}] },
    } as any);

    const response = await POST(createRequest({ token: "ok" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 400 when content/title is missing", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockBlogFindUnique.mockResolvedValue({
      id: "b1",
      authorId: "u1",
      status: "DRAFT",
      title: "",
      content: { content: [] },
    } as any);

    const response = await POST(createRequest({ token: "ok" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(400);
  });

  it("submits draft and revalidates layout", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockBlogFindUnique.mockResolvedValue({
      id: "b1",
      authorId: "u1",
      status: "DRAFT",
      title: "My blog",
      content: { content: [{ type: "paragraph" }] },
      deletedAt: null,
    } as any);
    mockBlogUpdate.mockResolvedValue({
      id: "b1",
      status: "PENDING_REVIEW",
    } as any);

    const response = await POST(createRequest({ token: "ok" }), {
      params: Promise.resolve({ id: "b1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.blog.status).toBe("PENDING_REVIEW");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
