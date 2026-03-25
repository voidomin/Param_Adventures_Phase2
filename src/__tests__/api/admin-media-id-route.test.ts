import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/s3", () => ({ deleteFromS3: vi.fn() }));
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
import { deleteFromS3 } from "@/lib/s3";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockDeleteFromS3 = vi.mocked(deleteFromS3);
const mockFindUnique = vi.mocked(prisma.image.findUnique);
const mockDelete = vi.mocked(prisma.image.delete);

describe("DELETE /api/admin/media/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("deletes record and returns s3Success true", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue({ id: "img-1", originalUrl: "https://cdn.example.com/a.jpg" } as any);
    mockDeleteFromS3.mockResolvedValue(true as any);
    mockDelete.mockResolvedValue({ id: "img-1" } as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "img-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, s3Success: true });
    expect(mockDeleteFromS3).toHaveBeenCalledWith("https://cdn.example.com/a.jpg");
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "img-1" } });
  });

  it("still deletes record when s3 deletion fails", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue({ id: "img-1", originalUrl: "https://cdn.example.com/a.jpg" } as any);
    mockDeleteFromS3.mockResolvedValue(false as any);
    mockDelete.mockResolvedValue({ id: "img-1" } as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "img-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, s3Success: false });
    expect(mockDelete).toHaveBeenCalledTimes(1);
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
