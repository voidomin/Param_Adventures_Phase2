import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/media/factory", () => ({ mediaFactory: { getProvider: vi.fn() } }));
vi.mock("@/lib/utils/url-safety", () => ({ isCloudinaryUrl: vi.fn(), isS3Url: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    image: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
    experience: {
      findMany: vi.fn(),
    },
    blog: {
      findMany: vi.fn(),
    },
    storyBlock: {
      findMany: vi.fn(),
    },
    tripLog: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    heroSlide: {
      findMany: vi.fn(),
    },
    platformSetting: {
      findMany: vi.fn(),
    },
  },
}));

import { GET, POST, DELETE } from "@/app/api/admin/media/route";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { mediaFactory } from "@/lib/media/factory";
import { isCloudinaryUrl, isS3Url } from "@/lib/utils/url-safety";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindMany = vi.mocked(prisma.image.findMany);
const mockCreate = vi.mocked(prisma.image.create);
const mockFindFirst = vi.mocked(prisma.image.findFirst);
const mockFindManyExp = vi.mocked(prisma.experience.findMany);
const mockFindManyBlog = vi.mocked(prisma.blog.findMany);
const mockFindManySb = vi.mocked(prisma.storyBlock.findMany);
const mockFindManyTl = vi.mocked(prisma.tripLog.findMany);
const mockFindManyUser = vi.mocked(prisma.user.findMany);
const mockFindManyHero = vi.mocked(prisma.heroSlide.findMany);
const mockFindManySetting = vi.mocked(prisma.platformSetting.findMany);

const createRequest = (body?: unknown) =>
  ({
    json: vi.fn().mockResolvedValue(body ?? {}),
  }) as unknown as NextRequest;

describe("/api/admin/media route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindManyExp.mockResolvedValue([]);
    mockFindManyBlog.mockResolvedValue([]);
    mockFindManySb.mockResolvedValue([]);
    mockFindManyTl.mockResolvedValue([]);
    mockFindManyUser.mockResolvedValue([]);
    mockFindManyHero.mockResolvedValue([]);
    mockFindManySetting.mockResolvedValue([]);
    mockFindFirst.mockResolvedValue(null);
  });

  describe("GET", () => {
    it("returns 403 when unauthorized", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

      const response = await GET({} as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns media list", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockFindMany.mockResolvedValue([{ id: "img-1" }] as any);

      const response = await GET({} as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.images).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
          orderBy: { createdAt: "desc" },
        }),
      );
    });

    it("returns 500 on query failure", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockFindMany.mockRejectedValue(new Error("db down"));

      const response = await GET({} as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch media library");
    });

    it("detects usages across all linked entity types", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockFindMany.mockResolvedValue([
        { id: "img-1", originalUrl: "https://cdn.com/a.jpg" },
      ] as any);
      mockFindManyExp.mockResolvedValue([
        { id: "exp-1", title: "Trek", cardImage: "https://cdn.com/a.jpg", coverImage: "https://cdn.com/a.jpg", images: ["https://cdn.com/a.jpg"] },
      ] as any);
      mockFindManyBlog.mockResolvedValue([
        { id: "blog-1", title: "Post", coverImageUrl: "https://cdn.com/a.jpg", coverImageId: null },
      ] as any);
      mockFindManySb.mockResolvedValue([
        { id: "sb-1", title: "Story", imageUrl: "https://cdn.com/a.jpg" },
      ] as any);
      mockFindManyTl.mockResolvedValue([
        { id: "tl-1", photoUrls: ["https://cdn.com/a.jpg"] },
      ] as any);
      mockFindManyUser.mockResolvedValue([
        { id: "u-1", name: "Jane", avatarUrl: "https://cdn.com/a.jpg" },
      ] as any);
      mockFindManyHero.mockResolvedValue([
        { id: "hs-1", title: "Slide", videoUrl: "https://cdn.com/a.jpg" },
      ] as any);
      mockFindManySetting.mockResolvedValue([
        { key: "site_logo", value: "https://cdn.com/a.jpg" },
      ] as any);

      const response = await GET({} as NextRequest);
      const data = await response.json();

      const types = data.images[0].usages.map((u: { type: string }) => u.type);
      expect(types).toEqual(
        expect.arrayContaining([
          "Experience Card", "Experience Cover", "Experience Gallery", "Blog Cover",
          "Story Block", "Trip Log Photo", "User Avatar", "Hero Slide", "System Setting",
        ]),
      );
      expect(data.images[0].usageCount).toBe(types.length);
    });
  });

  describe("POST", () => {
    it("returns 403 when unauthorized", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

      const response = await POST(createRequest());
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 for invalid payload", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

      const response = await POST(createRequest({ originalUrl: "bad-url" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("originalUrl must be a valid URL");
    });

    it("creates media and defaults type to IMAGE", async () => {
      mockAuthorizeRequest.mockResolvedValue({
        authorized: true,
        userId: "admin-1",
      } as any);
      mockCreate.mockResolvedValue({
        id: "img-1",
        originalUrl: "https://cdn.example.com/a.jpg",
        type: "IMAGE",
      } as any);

      const response = await POST(
        createRequest({ originalUrl: "https://cdn.example.com/a.jpg" }),
      );
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe("img-1");
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          originalUrl: "https://cdn.example.com/a.jpg",
          type: "IMAGE",
          uploadedById: "admin-1",
        },
      });
    });

    it("creates VIDEO media when type is provided", async () => {
      mockAuthorizeRequest.mockResolvedValue({
        authorized: true,
        userId: "admin-1",
      } as any);
      mockCreate.mockResolvedValue({ id: "vid-1", type: "VIDEO" } as any);

      const response = await POST(
        createRequest({
          originalUrl: "https://cdn.example.com/a.mp4",
          type: "VIDEO",
        }),
      );

      expect(response.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          originalUrl: "https://cdn.example.com/a.mp4",
          type: "VIDEO",
          uploadedById: "admin-1",
        },
      });
    });

    it("returns 500 on unexpected error", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockCreate.mockRejectedValue(new Error("db down"));

      const response = await POST(
        createRequest({ originalUrl: "https://cdn.example.com/a.jpg" }),
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to save media record");
    });
  });

  describe("DELETE", () => {
    beforeEach(() => {
      vi.mocked(isCloudinaryUrl).mockReturnValue(false);
      vi.mocked(isS3Url).mockReturnValue(false);
      vi.mocked(mediaFactory.getProvider).mockResolvedValue({ delete: vi.fn().mockResolvedValue(true) } as any);
    });

    it("returns 403 when unauthorized", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

      const response = await DELETE(createRequest({ ids: ["img-1"] }));
      expect(response.status).toBe(403);
    });

    it("returns 400 for an empty ids array", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

      const response = await DELETE(createRequest({ ids: [] }));
      expect(response.status).toBe(400);
    });

    it("returns 404 when no images are found for the given ids", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockFindMany.mockResolvedValue([]);

      const response = await DELETE(createRequest({ ids: ["missing"] }));
      expect(response.status).toBe(404);
    });

    it("deletes cloudinary media, database rows, and logs the bulk action", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin-1" } as any);
      vi.mocked(isCloudinaryUrl).mockReturnValue(true);
      const mockDelete = vi.fn().mockResolvedValue(true);
      vi.mocked(mediaFactory.getProvider).mockResolvedValue({ delete: mockDelete } as any);
      mockFindMany.mockResolvedValue([
        { id: "img-1", originalUrl: "https://res.cloudinary.com/demo/upload/v123/foo.jpg", type: "IMAGE" },
      ] as any);

      const response = await DELETE(createRequest({ ids: ["img-1"] }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true, count: 1 });
      expect(mockDelete).toHaveBeenCalledWith("foo", "image");
      expect(prisma.image.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["img-1"] } } });
      expect(logActivity).toHaveBeenCalledWith("MEDIA_BULK_DELETED", "admin-1", "Image", "img-1", { count: 1 });
    });

    it("deletes S3 media by extracting the key from the url", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin-1" } as any);
      vi.mocked(isS3Url).mockReturnValue(true);
      const mockDelete = vi.fn().mockResolvedValue(true);
      vi.mocked(mediaFactory.getProvider).mockResolvedValue({ delete: mockDelete } as any);
      mockFindMany.mockResolvedValue([
        { id: "img-2", originalUrl: "https://bucket.s3.amazonaws.com/path/file.jpg", type: "VIDEO" },
      ] as any);

      const response = await DELETE(createRequest({ ids: ["img-2"] }));

      expect(response.status).toBe(200);
      expect(mockDelete).toHaveBeenCalledWith("path/file.jpg");
    });

    it("returns 500 on an unexpected error", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin-1" } as any);
      mockFindMany.mockRejectedValue(new Error("db down"));

      const response = await DELETE(createRequest({ ids: ["img-1"] }));
      expect(response.status).toBe(500);
    });
  });
});
