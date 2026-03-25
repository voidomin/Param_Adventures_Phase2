import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/cloudinary", () => ({ uploadToCloudinary: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    image: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/admin/media/upload/route";
import { authorizeRequest } from "@/lib/api-auth";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockUploadToCloudinary = vi.mocked(uploadToCloudinary);
const mockFindFirst = vi.mocked(prisma.image.findFirst);
const mockCreate = vi.mocked(prisma.image.create);

type FileLike = {
  type: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

const makeFile = (type: string, content = "hello"): FileLike => ({
  type,
  arrayBuffer: async () => new TextEncoder().encode(content).buffer,
});

const createRequest = (file: FileLike | null) =>
  ({
    formData: vi.fn().mockResolvedValue({
      get: vi.fn(() => file),
    }),
  }) as unknown as NextRequest;

describe("POST /api/admin/media/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

    const response = await POST(createRequest(makeFile("image/jpeg")));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when file is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    const response = await POST(createRequest(null));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("No file provided.");
  });

  it("returns 400 for unsupported file type", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    const response = await POST(createRequest(makeFile("application/pdf")));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Only images and videos are supported.");
  });

  it("returns deduplicated response when file hash exists", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindFirst.mockResolvedValue({
      id: "img-1",
      originalUrl: "https://cdn.example.com/dup.jpg",
      type: "IMAGE",
    } as any);

    const response = await POST(createRequest(makeFile("image/jpeg", "dup")));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      id: "img-1",
      url: "https://cdn.example.com/dup.jpg",
      type: "IMAGE",
      deduplicated: true,
    });
    expect(mockUploadToCloudinary).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("uploads IMAGE file and stores database record", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      userId: "admin-1",
    } as any);
    mockFindFirst.mockResolvedValue(null);
    mockUploadToCloudinary.mockResolvedValue({
      secure_url: "https://cdn.example.com/new.jpg",
      public_id: "pub-1",
    } as any);
    mockCreate.mockResolvedValue({ id: "img-2", type: "IMAGE" } as any);

    const response = await POST(
      createRequest(makeFile("image/jpeg", "img-body")),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("img-2");
    expect(data.public_id).toBe("pub-1");
    expect(mockUploadToCloudinary).toHaveBeenCalledWith(expect.any(Buffer), {
      folder: "param-adventures/images",
      resource_type: "image",
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          originalUrl: "https://cdn.example.com/new.jpg",
          type: "IMAGE",
          uploadedById: "admin-1",
          fileHash: expect.any(String),
        }),
      }),
    );
  });

  it("uploads VIDEO file with video folder and type", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      userId: "admin-1",
    } as any);
    mockFindFirst.mockResolvedValue(null);
    mockUploadToCloudinary.mockResolvedValue({
      secure_url: "https://cdn.example.com/new.mp4",
      public_id: "pub-2",
    } as any);
    mockCreate.mockResolvedValue({ id: "vid-1", type: "VIDEO" } as any);

    const response = await POST(
      createRequest(makeFile("video/mp4", "vid-body")),
    );

    expect(response.status).toBe(200);
    expect(mockUploadToCloudinary).toHaveBeenCalledWith(expect.any(Buffer), {
      folder: "param-adventures/videos",
      resource_type: "video",
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "VIDEO" }),
      }),
    );
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindFirst.mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest(makeFile("image/jpeg")));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Upload failed. Please try again.");
  });
});
