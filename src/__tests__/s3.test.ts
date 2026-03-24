import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock AWS SDK
vi.mock("@aws-sdk/client-s3", () => {
  const S3Client = vi.fn(function() {
    return {
      send: vi.fn().mockResolvedValue({}),
    };
  });
  return {
    S3Client,
    PutObjectCommand: vi.fn(function() { return {}; }),
    DeleteObjectCommand: vi.fn(function() { return {}; }),
    GetObjectCommand: vi.fn(function() { return {}; }),
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://signed-url.com"),
}));

describe("S3 Utils", () => {
  let s3Utils: any;

  beforeAll(async () => {
    vi.stubEnv("AWS_REGION", "us-east-1");
    vi.stubEnv("AWS_ACCESS_KEY_ID", "fixed_key");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "fixed_secret");
    vi.stubEnv("AWS_S3_BUCKET_NAME", "test-bucket");
    s3Utils = await import("@/lib/s3");
  });

  describe("generatePresignedUrl", () => {
    it("successfully generates a presigned URL", async () => {
      const result = await s3Utils.generatePresignedUrl("test.jpg", "image/jpeg");
      expect(result.uploadUrl).toBe("https://signed-url.com");
      expect(result.finalUrl).toContain("test.jpg");
    });
  });

  describe("deleteFromS3", () => {
    it("successfully deletes a file", async () => {
      const result = await s3Utils.deleteFromS3("https://test-bucket.s3.amazonaws.com/test.jpg");
      expect(result).toBe(true);
    });

    it("skips deletion for mocked URLs", async () => {
      const result = await s3Utils.deleteFromS3("https://picsum.photos/200");
      expect(result).toBe(true);
    });
  });
});
