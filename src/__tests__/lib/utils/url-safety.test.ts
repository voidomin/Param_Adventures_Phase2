import { describe, it, expect } from "vitest";
import {
  isCloudinaryUrl,
  isResCloudinaryUrl,
  isAwsUrl,
  isS3Url,
  isAllowedMediaHost,
} from "@/lib/utils/url-safety";

describe("URL Safety Utilities", () => {
  describe("isCloudinaryUrl", () => {
    it("should return true for valid Cloudinary URLs", () => {
      expect(isCloudinaryUrl("https://cloudinary.com/path")).toBe(true);
      expect(isCloudinaryUrl("http://sub.cloudinary.com/image")).toBe(true);
    });

    it("should return false for invalid hosts or short hosts", () => {
      expect(isCloudinaryUrl("https://notcloudinary.com")).toBe(false);
      expect(isCloudinaryUrl("https://cloudinary.fake.com")).toBe(false);
      expect(isCloudinaryUrl("https://com")).toBe(false);
    });

    it("should return false for malformed URLs", () => {
      expect(isCloudinaryUrl("not-a-valid-url")).toBe(false);
    });
  });

  describe("isResCloudinaryUrl", () => {
    it("should return true for res.cloudinary.com URLs", () => {
      expect(isResCloudinaryUrl("https://res.cloudinary.com/assets/img.png")).toBe(true);
      expect(isResCloudinaryUrl("https://sub.res.cloudinary.com/assets/img.png")).toBe(true);
    });

    it("should return false for non-res subdomains or short hosts", () => {
      expect(isResCloudinaryUrl("https://cloudinary.com")).toBe(false);
      expect(isResCloudinaryUrl("https://res.fake.com")).toBe(false);
      expect(isResCloudinaryUrl("https://res.cloudinary.fake.com")).toBe(false);
    });

    it("should return false for malformed URLs", () => {
      expect(isResCloudinaryUrl("not-a-valid-url")).toBe(false);
    });
  });

  describe("isAwsUrl", () => {
    it("should return true for AWS amazonaws.com URLs", () => {
      expect(isAwsUrl("https://amazonaws.com")).toBe(true);
      expect(isAwsUrl("https://my-bucket.s3.amazonaws.com/file")).toBe(true);
    });

    it("should return false for invalid hosts", () => {
      expect(isAwsUrl("https://fakeamazonaws.com")).toBe(false);
      expect(isAwsUrl("https://amazonaws.fake.com")).toBe(false);
    });

    it("should return false for malformed URLs", () => {
      expect(isAwsUrl("not-a-valid-url")).toBe(false);
    });
  });

  describe("isS3Url", () => {
    it("should return true for S3 hosts on AWS, localhost, or 127.0.0.1", () => {
      expect(isS3Url("http://localhost:3000/media")).toBe(true);
      expect(isS3Url("http://127.0.0.1/media")).toBe(true);
      expect(isS3Url("https://my-bucket.s3.amazonaws.com/file.jpg")).toBe(true);
    });

    it("should return false for AWS hosts without s3 label", () => {
      expect(isS3Url("https://ec2.amazonaws.com/instance")).toBe(false);
    });

    it("should return false for short hostnames or non-S3 hosts", () => {
      expect(isS3Url("https://amazonaws.com")).toBe(false);
      expect(isS3Url("https://fake.com")).toBe(false);
    });

    it("should return false for malformed URLs", () => {
      expect(isS3Url("not-a-valid-url")).toBe(false);
    });
  });

  describe("isAllowedMediaHost", () => {
    it("should return true for Cloudinary and AWS hosts", () => {
      expect(isAllowedMediaHost("https://res.cloudinary.com/demo/img.jpg")).toBe(true);
      expect(isAllowedMediaHost("https://my-bucket.s3.amazonaws.com/file.jpg")).toBe(true);
    });

    it("should return false for arbitrary external hosts", () => {
      expect(isAllowedMediaHost("https://evil.example.com/img.jpg")).toBe(false);
      expect(isAllowedMediaHost("http://169.254.169.254/latest/meta-data/")).toBe(false);
    });

    it("should return false for malformed URLs", () => {
      expect(isAllowedMediaHost("not-a-valid-url")).toBe(false);
    });
  });
});
