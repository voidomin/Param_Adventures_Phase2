import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock("@/lib/cloudinary", () => ({
  uploadToCloudinary: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}));

import { PATCH, POST } from "@/app/api/user/avatar/route";
import { verifyAccessToken } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

const mockVerifyAccessToken = vi.mocked(verifyAccessToken);
const mockUploadToCloudinary = vi.mocked(uploadToCloudinary);
const mockUserUpdate = vi.mocked(prisma.user.update);
const mockRevalidatePath = vi.mocked(revalidatePath);

type ReqOpts = {
  token?: string;
  body?: unknown;
  file?: {
    type?: string;
    arrayBuffer?: () => Promise<ArrayBuffer>;
  } | null;
};

const createRequest = (opts: ReqOpts = {}) =>
  ({
    cookies: {
      get: vi.fn((name: string) =>
        name === "accessToken" && opts.token ? { value: opts.token } : undefined,
      ),
    },
    formData: vi.fn().mockResolvedValue({
      get: vi.fn(() => opts.file ?? null),
    }),
    json: vi.fn().mockResolvedValue(opts.body ?? {}),
  }) as unknown as NextRequest;

describe("/api/user/avatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST returns 401 when token is missing", async () => {
    const response = await POST(createRequest());

    expect(response.status).toBe(401);
  });

  it("POST returns 401 for invalid token", async () => {
    mockVerifyAccessToken.mockResolvedValue(null);

    const response = await POST(createRequest({ token: "bad" }));

    expect(response.status).toBe(401);
  });

  it("POST returns 400 when file is missing", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);

    const response = await POST(createRequest({ token: "ok", file: null }));

    expect(response.status).toBe(400);
  });

  it("POST returns 400 for non-image file", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);

    const response = await POST(
      createRequest({ token: "ok", file: { type: "application/pdf" } }),
    );

    expect(response.status).toBe(400);
  });

  it("POST uploads avatar and updates user", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockUploadToCloudinary.mockResolvedValue({ secure_url: "https://cdn/avatar.jpg" } as any);
    mockUserUpdate.mockResolvedValue({ id: "u1", avatarUrl: "https://cdn/avatar.jpg" } as any);

    const response = await POST(
      createRequest({
        token: "ok",
        file: {
          type: "image/png",
          arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
        },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.avatarUrl).toBe("https://cdn/avatar.jpg");
    expect(mockUploadToCloudinary).toHaveBeenCalled();
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { avatarUrl: "https://cdn/avatar.jpg" },
      select: { id: true, avatarUrl: true },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("PATCH returns 401 for missing token", async () => {
    const response = await PATCH(createRequest());

    expect(response.status).toBe(401);
  });

  it("PATCH returns 400 for invalid avatar URL", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);

    const response = await PATCH(
      createRequest({ token: "ok", body: { avatarUrl: "not-a-url" } }),
    );

    expect(response.status).toBe(400);
  });

  it("PATCH updates avatar URL on success", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockUserUpdate.mockResolvedValue({ id: "u1", avatarUrl: "https://cdn/new.jpg" } as any);

    const response = await PATCH(
      createRequest({ token: "ok", body: { avatarUrl: "https://cdn/new.jpg" } }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.avatarUrl).toBe("https://cdn/new.jpg");
  });
});
