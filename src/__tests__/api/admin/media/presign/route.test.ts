import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/s3", () => ({ generatePresignedUrl: vi.fn() }));
vi.mock("@/lib/cloudinary", () => ({
  generateCloudinarySignature: vi.fn(),
}));
vi.mock("@/lib/media/factory", () => ({
  mediaFactory: {
    getProvider: vi.fn(),
  },
}));

import { POST } from "@/app/api/admin/media/presign/route";
import { authorizeRequest } from "@/lib/api-auth";
import { generatePresignedUrl } from "@/lib/s3";
import { generateCloudinarySignature } from "@/lib/cloudinary";
import { mediaFactory } from "@/lib/media/factory";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockGeneratePresignedUrl = vi.mocked(generatePresignedUrl);
const mockGenerateCloudinarySignature = vi.mocked(generateCloudinarySignature);
const mockMediaFactory = vi.mocked(mediaFactory);

type ReqOpts = {
  body?: unknown;
};

const createRequest = (opts: ReqOpts = {}) =>
  ({
    json: vi.fn().mockResolvedValue(opts.body ?? {}),
  }) as unknown as NextRequest;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/admin/media/presign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CLOUDINARY_API_KEY", "");
    vi.stubEnv("AWS_REGION", "");
    vi.stubEnv("AWS_ACCESS_KEY_ID", "");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "");
    vi.stubEnv("AWS_S3_BUCKET_NAME", "");
  });

  it("returns 403 when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

    const response = await POST(
      createRequest({ body: { fileName: "a.jpg", contentType: "image/jpeg" } }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid payload", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    const response = await POST(
      createRequest({ body: { fileName: "", contentType: "" } }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(typeof data.error).toBe("string");
  });

  it("returns cloudinary payload when configured", async () => {
    mockMediaFactory.getProvider.mockResolvedValue({
      getPresignData: vi.fn().mockResolvedValue({
        provider: "cloudinary",
        signature: "sig",
        timestamp: 123,
        apiKey: "k",
        cloudName: "demo",
      }),
    } as any);

    const response = await POST(
      createRequest({ body: { fileName: "a.jpg", contentType: "image/jpeg" } }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.provider).toBe("cloudinary");
  });

  it("returns s3 payload when cloudinary is not configured and aws vars are present", async () => {
    mockMediaFactory.getProvider.mockResolvedValue({
      getPresignData: vi.fn().mockResolvedValue({
        provider: "s3",
        uploadUrl: "https://s3/upload",
        finalUrl: "https://s3/final",
      }),
    } as any);

    const response = await POST(
      createRequest({ body: { fileName: "a.jpg", contentType: "image/jpeg" } }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.provider).toBe("s3");
  });

  it("returns s3 payload even when aws vars are absent (mock mode)", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockMediaFactory.getProvider.mockResolvedValue({
      getPresignData: vi.fn().mockResolvedValue({
        provider: "s3",
        uploadUrl: "https://mock/upload",
        finalUrl: "https://mock/final",
      }),
    } as any);

    const response = await POST(
      createRequest({ body: { fileName: "b.jpg", contentType: "image/jpeg" } }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.provider).toBe("s3");
    expect(data.uploadUrl).toBe("https://mock/upload");
    expect(data.finalUrl).toBe("https://mock/final");
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockMediaFactory.getProvider.mockResolvedValue({
      getPresignData: vi.fn().mockRejectedValue(new Error("boom")),
    } as any);

    const response = await POST(
      createRequest({ body: { fileName: "a.jpg", contentType: "image/jpeg" } }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to generate upload URL");
  });
});
