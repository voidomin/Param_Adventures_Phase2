import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyAccessToken: vi.fn() }));
vi.mock("@/lib/sanitize", () => ({ sanitizeEditorContent: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    blog: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    booking: {
      findFirst: vi.fn(),
    },
    experience: {
      findUnique: vi.fn(),
    },
  },
}));

import { DELETE, PATCH } from "@/app/api/user/blogs/[id]/route";
import { revalidatePath } from "next/cache";
import { verifyAccessToken } from "@/lib/auth";
import { sanitizeEditorContent } from "@/lib/sanitize";
import { logActivity } from "@/lib/audit-logger";
import { prisma } from "@/lib/db";

const mockRevalidatePath = vi.mocked(revalidatePath);
const mockVerifyAccessToken = vi.mocked(verifyAccessToken);
const mockSanitizeEditorContent = vi.mocked(sanitizeEditorContent);
const mockLogActivity = vi.mocked(logActivity);
const mockBlogFindUnique = vi.mocked(prisma.blog.findUnique);
const mockBlogFindFirst = vi.mocked(prisma.blog.findFirst);
const mockBlogUpdate = vi.mocked(prisma.blog.update);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockBookingFindFirst = vi.mocked(prisma.booking.findFirst);
const mockExperienceFindUnique = vi.mocked(prisma.experience.findUnique);

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
    mockLogActivity.mockResolvedValue(undefined as any);
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

    it("allows an admin to attach a valid experienceId", async () => {
      mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
      mockBlogFindUnique.mockResolvedValue({
        id: "blog-1",
        authorId: "u1",
        status: "DRAFT",
      } as any);
      mockUserFindUnique.mockResolvedValue({ role: { name: "ADMIN" } } as any);
      mockExperienceFindUnique.mockResolvedValue({ id: "exp-1" } as any);
      mockBlogUpdate.mockResolvedValue({ id: "blog-1" } as any);

      const response = await PATCH(patchRequest({ experienceId: "exp-1" }, "t1"), {
        params: Promise.resolve({ id: "blog-1" }),
      });

      expect(response.status).toBe(200);
      expect(mockExperienceFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "exp-1" } }),
      );
      expect(mockBlogUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ experienceId: "exp-1" }) }),
      );
    });

    it("rejects an admin attaching a non-existent experienceId", async () => {
      mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
      mockBlogFindUnique.mockResolvedValue({
        id: "blog-1",
        authorId: "u1",
        status: "DRAFT",
      } as any);
      mockUserFindUnique.mockResolvedValue({ role: { name: "ADMIN" } } as any);
      mockExperienceFindUnique.mockResolvedValue(null);

      const response = await PATCH(patchRequest({ experienceId: "bad-exp" }, "t1"), {
        params: Promise.resolve({ id: "blog-1" }),
      });

      expect(response.status).toBe(400);
      expect(mockBlogUpdate).not.toHaveBeenCalled();
    });

    it("lets an admin clear experienceId back to null", async () => {
      mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
      mockBlogFindUnique.mockResolvedValue({
        id: "blog-1",
        authorId: "u1",
        status: "DRAFT",
      } as any);
      mockUserFindUnique.mockResolvedValue({ role: { name: "ADMIN" } } as any);
      mockBlogUpdate.mockResolvedValue({ id: "blog-1" } as any);

      const response = await PATCH(patchRequest({ experienceId: null }, "t1"), {
        params: Promise.resolve({ id: "blog-1" }),
      });

      expect(response.status).toBe(200);
      expect(mockExperienceFindUnique).not.toHaveBeenCalled();
      expect(mockBlogUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ experienceId: null }) }),
      );
    });

    it("rejects a non-admin clearing their required experienceId", async () => {
      mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
      mockBlogFindUnique.mockResolvedValue({
        id: "blog-1",
        authorId: "u1",
        status: "DRAFT",
      } as any);
      mockUserFindUnique.mockResolvedValue({ role: { name: "REGISTERED_USER" } } as any);

      const response = await PATCH(patchRequest({ experienceId: null }, "t1"), {
        params: Promise.resolve({ id: "blog-1" }),
      });

      expect(response.status).toBe(400);
      expect(mockBlogUpdate).not.toHaveBeenCalled();
    });

    it("rejects a non-admin changing to an experience without a completed booking", async () => {
      mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
      mockBlogFindUnique.mockResolvedValue({
        id: "blog-1",
        authorId: "u1",
        status: "DRAFT",
      } as any);
      mockUserFindUnique.mockResolvedValue({ role: { name: "REGISTERED_USER" } } as any);
      mockBookingFindFirst.mockResolvedValue(null);

      const response = await PATCH(patchRequest({ experienceId: "exp-2" }, "t1"), {
        params: Promise.resolve({ id: "blog-1" }),
      });

      expect(response.status).toBe(403);
      expect(mockBlogUpdate).not.toHaveBeenCalled();
    });

    it("rejects a non-admin changing to an experience they've already blogged about", async () => {
      mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
      mockBlogFindUnique.mockResolvedValue({
        id: "blog-1",
        authorId: "u1",
        status: "DRAFT",
      } as any);
      mockUserFindUnique.mockResolvedValue({ role: { name: "REGISTERED_USER" } } as any);
      mockBookingFindFirst.mockResolvedValue({ id: "booking-1" } as any);
      mockBlogFindFirst.mockResolvedValue({ id: "other-blog" } as any);

      const response = await PATCH(patchRequest({ experienceId: "exp-2" }, "t1"), {
        params: Promise.resolve({ id: "blog-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.blogId).toBe("other-blog");
      expect(mockBlogFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { not: "blog-1" } }),
        }),
      );
    });

    it("allows a non-admin to change to a different eligible experience", async () => {
      mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
      mockBlogFindUnique.mockResolvedValue({
        id: "blog-1",
        authorId: "u1",
        status: "DRAFT",
      } as any);
      mockUserFindUnique.mockResolvedValue({ role: { name: "REGISTERED_USER" } } as any);
      mockBookingFindFirst.mockResolvedValue({ id: "booking-1" } as any);
      mockBlogFindFirst.mockResolvedValue(null);
      mockBlogUpdate.mockResolvedValue({ id: "blog-1" } as any);

      const response = await PATCH(patchRequest({ experienceId: "exp-2" }, "t1"), {
        params: Promise.resolve({ id: "blog-1" }),
      });

      expect(response.status).toBe(200);
      expect(mockBlogUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ experienceId: "exp-2" }) }),
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
        title: "User draft blog title",
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
      expect(mockLogActivity).toHaveBeenCalledWith(
        "BLOG_DELETED",
        "u1",
        "Blog",
        "blog-1",
        { title: "User draft blog title", deletedBy: "AUTHOR" }
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
    });
  });
});
