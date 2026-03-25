import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock("@/lib/s3", () => ({
  generatePresignedUrl: vi.fn(),
}));

vi.mock("@/lib/cloudinary", () => ({
  generateCloudinarySignature: vi.fn(),
}));

import { POST } from "@/app/api/user/media/presign/route";
import { verifyAccessToken } from "@/lib/auth";
import { generatePresignedUrl } from "@/lib/s3";
import { generateCloudinarySignature } from "@/lib/cloudinary";

const mockVerifyAccessToken = vi.mocked(verifyAccessToken);
const mockGeneratePresignedUrl = vi.mocked(generatePresignedUrl);
const mockGenerateCloudinarySignature = vi.mocked(generateCloudinarySignature);

afterEach(() => {
  vi.unstubAllEnvs();
});

type ReqOpts = {
  token?: string;
  body?: unknown;
};

const createRequest = (opts: ReqOpts = {}) =>
  ({
    cookies: {
      get: vi.fn((name: string) =>
        name === "accessToken" && opts.token
          ? { value: opts.token }
          : undefined,
      ),
    },
    json: vi.fn().mockResolvedValue(opts.body ?? {}),
  }) as unknown as NextRequest;

describe("POST /api/user/media/presign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CLOUDINARY_API_KEY", "");
  });

  it("returns 401 when token is missing", async () => {
    const response = await POST(
      createRequest({ body: { fileName: "a.jpg", contentType: "image/jpeg" } }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required.");
  });

  it("returns 401 for invalid token", async () => {
    mockVerifyAccessToken.mockResolvedValue(null);

    const response = await POST(
      createRequest({
        token: "bad",
        body: { fileName: "a.jpg", contentType: "image/jpeg" },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid or expired token.");
  });

  it("returns 400 for invalid payload", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);

    const response = await POST(
      createRequest({ token: "ok", body: { fileName: "", contentType: "" } }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(typeof data.error).toBe("string");
  });

  it("returns cloudinary payload when cloudinary key exists", async () => {
    vi.stubEnv("CLOUDINARY_API_KEY", "present");
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockGenerateCloudinarySignature.mockResolvedValue({
      signature: "sig",
      timestamp: 123,
      apiKey: "k",
      cloudName: "c",
    } as any);

    const response = await POST(
      createRequest({
        token: "ok",
        body: { fileName: "a.jpg", contentType: "image/jpeg" },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.provider).toBe("cloudinary");
    expect(mockGenerateCloudinarySignature).toHaveBeenCalledWith(
      "param-adventures/users",
    );
    expect(mockGeneratePresignedUrl).not.toHaveBeenCalled();
  });

  it("returns s3 payload when cloudinary is not configured", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockGeneratePresignedUrl.mockResolvedValue({
      uploadUrl: "https://s3/upload",
      finalUrl: "https://s3/final",
    } as any);

    const response = await POST(
      createRequest({
        token: "ok",
        body: { fileName: "a.jpg", contentType: "image/jpeg" },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      provider: "s3",
      uploadUrl: "https://s3/upload",
      finalUrl: "https://s3/final",
    });
  });

  it("returns 500 on unexpected error", async () => {
    mockVerifyAccessToken.mockRejectedValue(new Error("token parse failed"));

    const response = await POST(
      createRequest({
        token: "ok",
        body: { fileName: "a.jpg", contentType: "image/jpeg" },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to generate upload authorization");
  });
});

