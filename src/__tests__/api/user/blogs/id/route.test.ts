import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyAccessToken: vi.fn() }));
vi.mock("@/lib/sanitize", () => ({ sanitizeEditorContent: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    blog: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { DELETE, PATCH } from "@/app/api/user/blogs/[id]/route";
import { revalidatePath } from "next/cache";
import { verifyAccessToken } from "@/lib/auth";
import { sanitizeEditorContent } from "@/lib/sanitize";
import { prisma } from "@/lib/db";

const mockRevalidatePath = vi.mocked(revalidatePath);
const mockVerifyAccessToken = vi.mocked(verifyAccessToken);
const mockSanitizeEditorContent = vi.mocked(sanitizeEditorContent);
const mockBlogFindUnique = vi.mocked(prisma.blog.findUnique);
const mockBlogUpdate = vi.mocked(prisma.blog.update);

const patchRequest = (body: unknown, token?: string) =>
  new NextRequest("http://localhost/api/user/blogs/blog-1", {
    method: "PATCH",
    headers: token ? { cookie: `accessToken=${token}` } : undefined,
    body: JSON.stringify(body),
  });

const deleteRequest = (token?: string) =>
  new NextRequest("http://localhost/api/user/blogs/blog-1", {
    method: "DELETE",
    headers: token ? { cookie: `accessToken=${token}` } : undefined,
  });

describe("/api/user/blogs/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PATCH", () => {
    it("returns 401 when token is missing", async () => {
      const response = await PATCH(patchRequest({ title: "X" }), {
        params: Promise.resolve({ id: "blog-1" }),
      });

      expect(response.status).toBe(401);
    });

    it("returns 401 for invalid token", async () => {
      mockVerifyAccessToken.mockResolvedValue(null);

      const response = await PATCH(patchRequest({ title: "X" }, "bad"), {
        params: Promise.resolve({ id: "blog-1" }),
      });

      expect(response.status).toBe(401);
    });

    it("returns 404 when blog does not exist", async () => {
      mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
      mockBlogFindUnique.mockResolvedValue(null);

      const response = await PATCH(patchRequest({ title: "X" }, "t1"), {
        params: Promise.resolve({ id: "blog-1" }),
      });

      expect(response.status).toBe(404);
    });

    it("returns 403 when blog belongs to another user", async () => {
      mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
      mockBlogFindUnique.mockResolvedValue({
        id: "blog-1",
        authorId: "u2",
        status: "DRAFT",
      } as any);

      const response = await PATCH(patchRequest({ title: "X" }, "t1"), {
        params: Promise.resolve({ id: "blog-1" }),
      });

      expect(response.status).toBe(403);
    });

    it("returns 400 when blog is not draft", async () => {
      mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
      mockBlogFindUnique.mockResolvedValue({
        id: "blog-1",
        authorId: "u1",
        status: "PENDING_REVIEW",
      } as any);

      const response = await PATCH(patchRequest({ title: "X" }, "t1"), {
        params: Promise.resolve({ id: "blog-1" }),
      });

      expect(response.status).toBe(400);
    });

    it("returns 400 when payload validation fails", async () => {
      mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
      mockBlogFindUnique.mockResolvedValue({
        id: "blog-1",
        authorId: "u1",
        status: "DRAFT",
      } as any);

      const response = await PATCH(patchRequest({ title: "" }, "t1"), {
        params: Promise.resolve({ id: "blog-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeTypeOf("string");
    });

    it("updates draft blog and sanitizes content", async () => {
      mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
      mockBlogFindUnique.mockResolvedValue({
        id: "blog-1",
        authorId: "u1",
        status: "DRAFT",
      } as any);
      mockSanitizeEditorContent.mockReturnValue({
        type: "doc",
        content: [],
      } as any);
      mockBlogUpdate.mockResolvedValue({
        id: "blog-1",
        title: "New title",
      } as any);

      const response = await PATCH(
        patchRequest(
          {
            title: "  New title  ",
            content: { type: "doc" },
            coverImageUrl: "https://cdn.example.com/c.jpg",
            theme: "MODERN",
          },
          "t1",
        ),
        { params: Promise.resolve({ id: "blog-1" }) },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.blog.id).toBe("blog-1");
      expect(mockSanitizeEditorContent).toHaveBeenCalled();
      expect(mockBlogUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "blog-1" },
          data: expect.objectContaining({
            title: "New title",
            content: { type: "doc", content: [] },
            theme: "MODERN",
          }),
        }),
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("updates draft blog with omitted optional fields", async () => {
      mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
      mockBlogFindUnique.mockResolvedValue({
        id: "blog-1",
        authorId: "u1",
        status: "DRAFT",
      } as any);
      mockBlogUpdate.mockResolvedValue({
        id: "blog-1",
      } as any);

      const response = await PATCH(patchRequest({}, "t1"), {
        params: Promise.resolve({ id: "blog-1" }),
      });

      expect(response.status).toBe(200);
      expect(mockSanitizeEditorContent).not.toHaveBeenCalled();
      expect(mockBlogUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "blog-1" },
          data: {},
        }),
      );
    });

    it("supports clearing cover image and updating author socials", async () => {
      mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
      mockBlogFindUnique.mockResolvedValue({
        id: "blog-1",
        authorId: "u1",
        status: "DRAFT",
      } as any);
      mockBlogUpdate.mockResolvedValue({ id: "blog-1" } as any);

      const response = await PATCH(
        patchRequest({ coverImageUrl: null, authorSocials: { instagram: "@param" } }, "t1"),
        { params: Promise.resolve({ id: "blog-1" }) },
      );

      expect(response.status).toBe(200);
      expect(mockBlogUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            coverImageUrl: null,
            authorSocials: { instagram: "@param" },
          }),
        }),
      );
    });

    it("returns 500 on unexpected failure", async () => {
      mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
      mockBlogFindUnique.mockResolvedValue({
        id: "blog-1",
        authorId: "u1",
        status: "DRAFT",
      } as any);
      mockBlogUpdate.mockRejectedValue(new Error("db down"));

      const response = await PATCH(
        patchRequest(
          {
            title: "Another title",
            coverImageUrl: "https://cdn.example.com/c.jpg",
          },
          "t1",
        ),
        { params: Promise.resolve({ id: "blog-1" }) },
      );

      expect(response.status).toBe(500);
    });
  });

  describe("DELETE", () => {
    it("returns 401 when token is missing", async () => {
      const response = await DELETE(deleteRequest(), {
        params: Promise.resolve({ id: "blog-1" }),
      });

      expect(response.status).toBe(401);
    });

    it("soft deletes blog for author", async () => {
      mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
      mockBlogFindUnique.mockResolvedValue({
        id: "blog-1",
        authorId: "u1",
        status: "DRAFT",
      } as any);
      mockBlogUpdate.mockResolvedValue({ id: "blog-1" } as any);

      const response = await DELETE(deleteRequest("t1"), {
        params: Promise.resolve({ id: "blog-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockBlogUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "blog-1" },
          data: { deletedAt: expect.any(Date) },
        }),
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
    });
  });
});
