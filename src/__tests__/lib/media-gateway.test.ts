import { describe, it, expect } from "vitest";
import { getMediaUrl } from "@/lib/media/media-gateway";

describe("Media Gateway Utility Tests", () => {
  const settings = {
    cloudinaryCloudName: "my-cloud",
    s3Bucket: "my-bucket",
    s3Region: "us-west-2",
    globalQuality: 80,
    highFidelity: false,
  };

  it("should return empty string if no path is provided", () => {
    expect(getMediaUrl("", "CLOUDINARY", settings)).toBe("");
  });

  it("should return raw path if path is a non-media HTTP URL", () => {
    const rawUrl = "https://example.com/some-page";
    expect(getMediaUrl(rawUrl, "CLOUDINARY", settings)).toBe(rawUrl);
  });

  describe("Cloudinary Provider", () => {
    it("should build standard Cloudinary image URL with auto-transformations", () => {
      const path = "treks/summit.jpg";
      const url = getMediaUrl(path, "CLOUDINARY", settings, {
        width: 800,
        height: 600,
        crop: "fill",
      });

      expect(url).toBe("https://res.cloudinary.com/my-cloud/image/upload/q_80,f_auto,w_800,h_600,c_fill/treks/summit.jpg");
    });

    it("should default to high fidelity best quality transforms if enabled", () => {
      const path = "treks/summit.jpg";
      const hfSettings = { ...settings, highFidelity: true, globalQuality: 95 };
      const url = getMediaUrl(path, "CLOUDINARY", hfSettings);

      expect(url).toBe("https://res.cloudinary.com/my-cloud/image/upload/q_auto:best,f_auto/treks/summit.jpg");
    });

    it("should handle video path and use video resource type in url", () => {
      const path = "videos/trek_highlights.mp4";
      const url = getMediaUrl(path, "CLOUDINARY", settings);

      expect(url).toBe("https://res.cloudinary.com/my-cloud/video/upload/q_80,f_auto/videos/trek_highlights.mp4");
    });

    it("should auto-detect Cloudinary provider from a full Cloudinary URL and parse path", () => {
      const fullCloudinaryUrl = "https://res.cloudinary.com/other-cloud/image/upload/v12345/gallery/tent.png";
      const url = getMediaUrl(fullCloudinaryUrl, "AWS_S3", settings);

      // Should switch to Cloudinary and parse out path
      expect(url).toBe("https://res.cloudinary.com/my-cloud/image/upload/q_80,f_auto/gallery/tent.png");
    });
  });

  describe("AWS S3 / S3 Provider", () => {
    it("should build standard S3 URL", () => {
      const path = "uploads/invoice.pdf";
      const url = getMediaUrl(path, "AWS_S3", settings);

      expect(url).toBe("https://my-bucket.s3.us-west-2.amazonaws.com/uploads/invoice.pdf");
    });

    it("should respect cdnUrl settings if provided", () => {
      const path = "uploads/invoice.pdf";
      const cdnSettings = { ...settings, cdnUrl: "https://cdn.paramadventures.in" };
      const url = getMediaUrl(path, "AWS_S3", cdnSettings);

      expect(url).toBe("https://cdn.paramadventures.in/uploads/invoice.pdf");
    });

    it("should auto-detect S3 provider from an AWS s3 URL", () => {
      const fullAwsUrl = "https://some-old-bucket.s3.amazonaws.com/legacy/trek.jpg";
      const url = getMediaUrl(fullAwsUrl, "CLOUDINARY", settings);

      // Should switch to S3 URL structure using settings bucket
      expect(url).toBe("https://my-bucket.s3.us-west-2.amazonaws.com/legacy/trek.jpg");
    });
  });

  describe("Fallback Behavior", () => {
    it("should return relative path prefixed with slash if provider is unknown", () => {
      const path = "local/asset.png";
      const url = getMediaUrl(path, "UNKNOWN_PROVIDER" as any, {});

      expect(url).toBe("/local/asset.png");
    });
  });
});
