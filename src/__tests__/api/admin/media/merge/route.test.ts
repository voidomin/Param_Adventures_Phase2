import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/media/factory", () => ({
  mediaFactory: { getProvider: vi.fn() },
}));
vi.mock("@/lib/utils/url-safety", () => ({
  isCloudinaryUrl: vi.fn(),
  isS3Url: vi.fn(),
}));
vi.mock("@/lib/db", () => {
  const mockPrisma = {
    image: { findUnique: vi.fn(), delete: vi.fn() },
    experience: { updateMany: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    blog: { updateMany: vi.fn() },
    storyBlock: { updateMany: vi.fn() },
    tripLog: { findMany: vi.fn(), update: vi.fn() },
    user: { updateMany: vi.fn() },
    heroSlide: { updateMany: vi.fn() },
    platformSetting: { updateMany: vi.fn() },
    $transaction: vi.fn(),
  };
  mockPrisma.$transaction = vi.fn().mockImplementation(async (cb: any) => cb(mockPrisma));
  return { prisma: mockPrisma };
});

import { POST } from "@/app/api/admin/media/merge/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { mediaFactory } from "@/lib/media/factory";
import { isCloudinaryUrl, isS3Url } from "@/lib/utils/url-safety";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const createRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

const sourceImage = { id: "src-1", originalUrl: "https://res.cloudinary.com/demo/upload/v123/foo.jpg", type: "IMAGE" };
const targetImage = { id: "tgt-1", originalUrl: "https://res.cloudinary.com/demo/upload/v456/bar.jpg", type: "IMAGE" };

describe("POST /api/admin/media/merge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma));
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin-1" } as any);
    vi.mocked(prisma.image.findUnique)
      .mockImplementation((async ({ where }: any) => {
        if (where.id === "src-1") return sourceImage as any;
        if (where.id === "tgt-1") return targetImage as any;
        return null;
      }) as any);
    vi.mocked(prisma.experience.findMany).mockResolvedValue([]);
    vi.mocked(prisma.tripLog.findMany).mockResolvedValue([]);
    vi.mocked(isCloudinaryUrl).mockReturnValue(true);
    vi.mocked(isS3Url).mockReturnValue(false);
    vi.mocked(mediaFactory.getProvider).mockResolvedValue({
      delete: vi.fn().mockResolvedValue(true),
    } as any);
  });

  it("returns 403 when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

    const response = await POST(createRequest({ sourceId: "src-1", targetId: "tgt-1" }));
    expect(response.status).toBe(403);
  });

  it("returns 400 for an invalid body", async () => {
    const response = await POST(createRequest({ sourceId: "" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when source and target are the same", async () => {
    const response = await POST(createRequest({ sourceId: "src-1", targetId: "src-1" }));
    expect(response.status).toBe(400);
  });

  it("returns 404 when either image record is missing", async () => {
    vi.mocked(prisma.image.findUnique).mockResolvedValue(null);

    const response = await POST(createRequest({ sourceId: "src-1", targetId: "tgt-1" }));
    expect(response.status).toBe(404);
  });

  it("merges references, deletes the duplicate, and cleans up cloud storage", async () => {
    const response = await POST(createRequest({ sourceId: "src-1", targetId: "tgt-1" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, message: expect.any(String), cloudDeleteSuccess: true });
    expect(prisma.experience.updateMany).toHaveBeenCalledWith({
      where: { cardImage: sourceImage.originalUrl },
      data: { cardImage: targetImage.originalUrl },
    });
    expect(prisma.image.delete).toHaveBeenCalledWith({ where: { id: "src-1" } });
  });

  it("updates array-based references (experience images, trip log photos)", async () => {
    vi.mocked(prisma.experience.findMany).mockResolvedValue([
      { id: "exp-1", images: [sourceImage.originalUrl, "other.jpg"] },
    ] as any);
    vi.mocked(prisma.tripLog.findMany).mockResolvedValue([
      { id: "tl-1", photoUrls: [sourceImage.originalUrl] },
    ] as any);

    await POST(createRequest({ sourceId: "src-1", targetId: "tgt-1" }));

    expect(prisma.experience.update).toHaveBeenCalledWith({
      where: { id: "exp-1" },
      data: { images: [targetImage.originalUrl, "other.jpg"] },
    });
    expect(prisma.tripLog.update).toHaveBeenCalledWith({
      where: { id: "tl-1" },
      data: { photoUrls: [targetImage.originalUrl] },
    });
  });

  it("deletes from S3 when the source url is an S3 url", async () => {
    vi.mocked(isCloudinaryUrl).mockReturnValue(false);
    vi.mocked(isS3Url).mockReturnValue(true);
    const mockDelete = vi.fn().mockResolvedValue(true);
    vi.mocked(mediaFactory.getProvider).mockResolvedValue({ delete: mockDelete } as any);
    vi.mocked(prisma.image.findUnique).mockImplementation((async ({ where }: any) => {
      if (where.id === "src-1") return { ...sourceImage, originalUrl: "https://bucket.s3.amazonaws.com/path/to/file.jpg" } as any;
      if (where.id === "tgt-1") return targetImage as any;
      return null;
    }) as any);

    const response = await POST(createRequest({ sourceId: "src-1", targetId: "tgt-1" }));
    const data = await response.json();

    expect(data.cloudDeleteSuccess).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith("path/to/file.jpg");
  });

  it("returns cloudDeleteSuccess false when the cloud provider throws", async () => {
    vi.mocked(mediaFactory.getProvider).mockRejectedValue(new Error("provider unavailable"));

    const response = await POST(createRequest({ sourceId: "src-1", targetId: "tgt-1" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cloudDeleteSuccess).toBe(false);
  });

  it("returns 500 on an unexpected error", async () => {
    vi.mocked(prisma.image.findUnique).mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest({ sourceId: "src-1", targetId: "tgt-1" }));
    expect(response.status).toBe(500);
  });
});
