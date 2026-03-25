import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    image: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from "@/app/api/admin/media/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindMany = vi.mocked(prisma.image.findMany);
const mockCreate = vi.mocked(prisma.image.create);

const createRequest = (body?: unknown) =>
  ({
    json: vi.fn().mockResolvedValue(body ?? {}),
  }) as unknown as NextRequest;

describe("/api/admin/media route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
