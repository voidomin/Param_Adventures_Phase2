import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockDeleteFromCloud } = vi.hoisted(() => ({
  mockDeleteFromCloud: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/media/factory", () => ({
  mediaFactory: {
    getProvider: vi.fn().mockResolvedValue({
      delete: mockDeleteFromCloud,
    }),
  },
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    image: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { DELETE } from "@/app/api/admin/media/[id]/route";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockLogActivity = vi.mocked(logActivity);
const mockFindUnique = vi.mocked(prisma.image.findUnique);
const mockDelete = vi.mocked(prisma.image.delete);

describe("DELETE /api/admin/media/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogActivity.mockResolvedValue(undefined as any);
  });

  it("returns 403 when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "img-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when image is not found", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue(null);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "img-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Image not found");
  });

  it("deletes record and returns deleteSuccess true", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin-1" } as any);
    mockFindUnique.mockResolvedValue({
      id: "img-1",
      originalUrl: "https://bucket.s3.ap-south-1.amazonaws.com/uploads/a.jpg",
      type: "IMAGE",
    } as any);
    mockDeleteFromCloud.mockResolvedValue(true);
    mockDelete.mockResolvedValue({ id: "img-1" } as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "img-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, deleteSuccess: true });
    expect(mockDeleteFromCloud).toHaveBeenCalledWith("uploads/a.jpg");
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "img-1" } });
    expect(mockLogActivity).toHaveBeenCalledWith(
      "MEDIA_DELETED",
      "admin-1",
      "Image",
      "img-1",
      { url: "https://bucket.s3.ap-south-1.amazonaws.com/uploads/a.jpg", type: "IMAGE" }
    );
  });

  it("still deletes record when cloud deletion fails", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin-1" } as any);
    mockFindUnique.mockResolvedValue({
      id: "img-1",
      originalUrl: "https://bucket.s3.ap-south-1.amazonaws.com/uploads/a.jpg",
      type: "IMAGE",
    } as any);
    mockDeleteFromCloud.mockResolvedValue(false);
    mockDelete.mockResolvedValue({ id: "img-1" } as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "img-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, deleteSuccess: false });
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockLogActivity).toHaveBeenCalledWith(
      "MEDIA_DELETED",
      "admin-1",
      "Image",
      "img-1",
      { url: "https://bucket.s3.ap-south-1.amazonaws.com/uploads/a.jpg", type: "IMAGE" }
    );
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockRejectedValue(new Error("db down"));

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "img-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to delete media");
  });
});
