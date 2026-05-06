import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadToCloudinary, deleteFromCloudinary, generateCloudinarySignature } from "@/lib/cloudinary";
import { v2 as cloudinary } from "cloudinary";

vi.mock("cloudinary", () => ({
  v2: {
    config: vi.fn(),
    uploader: {
      upload_stream: vi.fn((options, callback) => {
        // Return a mock stream with an .end() method
        return {
          end: vi.fn(() => {
            callback(null, {
              public_id: "test_id",
              secure_url: "https://test.url",
              resource_type: "image",
              format: "jpg",
              bytes: 100,
            });
          }),
        };
      }),
      destroy: vi.fn().mockResolvedValue({ result: "ok" }),
    },
    utils: {
      api_sign_request: vi.fn().mockReturnValue("mock_signature"),
    },
  },
}));

describe("Cloudinary Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("uploadToCloudinary", () => {
    it("successfully uploads an image", async () => {
      const buffer = Buffer.from("test");
      const result = await uploadToCloudinary(buffer, { resource_type: "image" });
      
      expect(result.public_id).toBe("test_id");
      expect(cloudinary.uploader.upload_stream).toHaveBeenCalled();
    });

    it("handles upload errors", async () => {
      vi.mocked(cloudinary.uploader.upload_stream as any).mockImplementationOnce((options: any, callback?: any) => {
        return {
          end: vi.fn(() => {
            callback(new Error("Upload Failed"), null);
          }),
        } as unknown;
      });

      const buffer = Buffer.from("test");
      await expect(uploadToCloudinary(buffer)).rejects.toThrow("Upload Failed");
    });

    it("normalizes string upload errors", async () => {
      vi.mocked(cloudinary.uploader.upload_stream as any).mockImplementationOnce((options: any, callback?: any) => {
        return {
          end: vi.fn(() => {
            callback("String upload failure", null);
          }),
        } as unknown;
      });

      const buffer = Buffer.from("test");
      await expect(uploadToCloudinary(buffer)).rejects.toThrow("String upload failure");
    });

    it("normalizes object upload errors with message", async () => {
      vi.mocked(cloudinary.uploader.upload_stream as any).mockImplementationOnce((options: any, callback?: any) => {
        return {
          end: vi.fn(() => {
            callback({ message: "Object upload failure" }, null);
          }),
        } as unknown;
      });

      const buffer = Buffer.from("test");
      await expect(uploadToCloudinary(buffer)).rejects.toThrow("Object upload failure");
    });

    it("uses fallback message for unknown upload errors", async () => {
      vi.mocked(cloudinary.uploader.upload_stream as any).mockImplementationOnce((options: any, callback?: any) => {
        return {
          end: vi.fn(() => {
            callback({}, null);
          }),
        } as unknown;
      });

      const buffer = Buffer.from("test");
      await expect(uploadToCloudinary(buffer)).rejects.toThrow("Cloudinary upload failed");
    });
  });

  describe("deleteFromCloudinary", () => {
    it("successfully deletes an asset", async () => {
      const result = await deleteFromCloudinary("test_id");
      expect(result).toBe(true);
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("test_id", expect.any(Object));
    });

    it("returns false on deletion error", async () => {
      vi.mocked(cloudinary.uploader.destroy).mockRejectedValueOnce(new Error("Delete Failed"));
      const result = await deleteFromCloudinary("test_id");
      expect(result).toBe(false);
    });
  });

  describe("generateCloudinarySignature", () => {
    it("generates a valid signature", async () => {
      const result = await generateCloudinarySignature("test-folder");
      expect(result.signature).toBe("mock_signature");
      expect(result.folder).toBe("test-folder");
      expect(result.timestamp).toBeDefined();
    });
  });
});
