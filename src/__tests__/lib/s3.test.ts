import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generatePresignedUrl, deleteFromS3 } from "@/lib/s3";


// Mock AWS SDK
vi.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: class {
      send = vi.fn().mockResolvedValue({});
    },
    PutObjectCommand: class { constructor(public input: any) {} },
    DeleteObjectCommand: class { constructor(public input: any) {} },
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://s3.amazonaws.com/mock-presigned-url"),
}));

describe("S3 Utilities", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Mocked Environment (No S3 Config)", () => {
    beforeEach(() => {
      // Simulate missing S3 bucket env var
      process.env = { ...originalEnv };
      delete process.env.AWS_S3_BUCKET_NAME;
    });

    it("returns a generic mock URL for images", async () => {
      const result = await generatePresignedUrl("test.jpg", "image/jpeg");
      expect(result.uploadUrl).toBe("MOCK_UPLOAD");
      expect(result.finalUrl).toContain("picsum.photos");
    });

    it("returns a specific mock URL for videos", async () => {
      const result = await generatePresignedUrl("test.mp4", "video/mp4");
      expect(result.uploadUrl).toBe("MOCK_UPLOAD");
      expect(result.finalUrl).toContain("mixkit");
      expect(result.finalUrl).toContain(".mp4");
    });

    it("always succeeds on delete for mocked files", async () => {
      const result = await deleteFromS3("https://picsum.photos/seed/123/800/600");
      expect(result).toBe(true);
    });
  });

  describe("Real S3 Environment", () => {
    beforeEach(() => {
      // Stub required env vars to trigger "real" branch
      process.env = {
        ...originalEnv,
        AWS_REGION: "us-east-1",
        AWS_ACCESS_KEY_ID: "test_key",
        AWS_SECRET_ACCESS_KEY: "test_secret",
        AWS_S3_BUCKET_NAME: "test-bucket",
      };
      // We must reset modules to force re-evaluation of `isS3Configured` at module level
      // However, simple resetModules might not be enough if it's imported at top level in tests.
      // Easiest is to test the logic directly or accept that evaluating module-level constants 
      // is tricky. Since the module creates s3Client at load time, changing process.env here 
      // doesn't re-run that unless we lazily load the module.
    });

    // Since `isS3Configured` is evaluated when the module is first imported,
    // we would need dynamic imports to fully test both branches in the same file.
    // Instead of complicating the test suite, we can use `vi.resetModules()` 
    // and dynamic `await import` if strictly tracking coverage.
    
    it("generates a real presigned URL when configured", async () => {
      vi.resetModules();
      process.env.AWS_REGION = "us-east-1";
      process.env.AWS_ACCESS_KEY_ID = "test_key";
      process.env.AWS_SECRET_ACCESS_KEY = "test_secret";
      process.env.AWS_S3_BUCKET_NAME = "test-bucket";

      const { generatePresignedUrl } = await import("@/lib/s3");
      const result = await generatePresignedUrl("test image.jpg", "image/jpeg");
      
      expect(result.uploadUrl).toBe("https://s3.amazonaws.com/mock-presigned-url");
      expect(result.finalUrl).toContain("https://test-bucket.s3.us-east-1.amazonaws.com/uploads/");
      expect(result.finalUrl).toContain("test_image.jpg");
    });

    it("attempts delete and returns true on success when configured", async () => {
      vi.resetModules();
      process.env.AWS_REGION = "us-east-1";
      process.env.AWS_ACCESS_KEY_ID = "test_key";
      process.env.AWS_SECRET_ACCESS_KEY = "test_secret";
      process.env.AWS_S3_BUCKET_NAME = "test-bucket";

      const { deleteFromS3 } = await import("@/lib/s3");
      const result = await deleteFromS3("https://test-bucket.s3.us-east-1.amazonaws.com/uploads/123-test.jpg");
      
      expect(result).toBe(true);
    });

    it("returns false and logs error when delete fails", async () => {
      vi.resetModules();
      process.env.AWS_REGION = "us-east-1";
      process.env.AWS_ACCESS_KEY_ID = "test_key";
      process.env.AWS_SECRET_ACCESS_KEY = "test_secret";
      process.env.AWS_S3_BUCKET_NAME = "test-bucket";

      // Re-mock S3Client just for this test to throw
      vi.doMock("@aws-sdk/client-s3", () => ({
        S3Client: class {
          send = vi.fn().mockRejectedValue(new Error("Network Error"));
        },
        DeleteObjectCommand: class { constructor(public input: any) {} },
      }));

      const { deleteFromS3 } = await import("@/lib/s3");
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      
      const result = await deleteFromS3("https://test-bucket.s3.us-east-1.amazonaws.com/uploads/bad.jpg");
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith("Failed to delete from S3:", expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
});
