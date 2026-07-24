import { describe, it, expect, vi, beforeEach } from "vitest";

const { sendMock, s3ClientCtor, putObjectCtor, deleteObjectCtor, getSignedUrlMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  s3ClientCtor: vi.fn(function (this: { send: typeof sendMock }) {
    this.send = sendMock;
  }),
  putObjectCtor: vi.fn(function (this: { input: unknown }, input: unknown) {
    this.input = input;
  }),
  deleteObjectCtor: vi.fn(function (this: { input: unknown }, input: unknown) {
    this.input = input;
  }),
  getSignedUrlMock: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: s3ClientCtor,
  PutObjectCommand: putObjectCtor,
  DeleteObjectCommand: deleteObjectCtor,
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: getSignedUrlMock,
}));

import { S3Provider } from "@/lib/media/providers/s3";

describe("S3Provider", () => {
  const config = {
    bucket: "param-adventures-media",
    region: "ap-south-1",
    accessKeyId: "AKIA_TEST",
    secretAccessKey: "secret",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("configures the S3 client with the given region and credentials", () => {
    new S3Provider(config);

    expect(s3ClientCtor).toHaveBeenCalledWith({
      region: "ap-south-1",
      credentials: { accessKeyId: "AKIA_TEST", secretAccessKey: "secret" },
    });
  });

  it("defaults region to ap-south-1 when not provided", () => {
    new S3Provider({ ...config, region: "" });

    expect(s3ClientCtor).toHaveBeenCalledWith(
      expect.objectContaining({ region: "ap-south-1" }),
    );
  });

  it("uploads a buffer and returns a public URL keyed by folder/public_id", async () => {
    sendMock.mockResolvedValue({});
    const provider = new S3Provider(config);

    const result = await provider.upload(Buffer.from("data"), { folder: "avatars", public_id: "user-1", resource_type: "image" });

    expect(putObjectCtor).toHaveBeenCalledWith(
      expect.objectContaining({ Bucket: "param-adventures-media", Key: "avatars/user-1", ContentType: "image/jpeg" }),
    );
    expect(result.public_id).toBe("avatars/user-1");
    expect(result.secure_url).toBe("https://param-adventures-media.s3.ap-south-1.amazonaws.com/avatars/user-1");
    expect(result.bytes).toBe(4);
  });

  it("uses application/octet-stream content type for non-image uploads", async () => {
    sendMock.mockResolvedValue({});
    const provider = new S3Provider(config);

    await provider.upload(Buffer.from("data"), { folder: "docs" });

    expect(putObjectCtor).toHaveBeenCalledWith(
      expect.objectContaining({ ContentType: "application/octet-stream" }),
    );
  });

  it("deletes successfully and returns true", async () => {
    sendMock.mockResolvedValue({});
    const provider = new S3Provider(config);

    const result = await provider.delete("avatars/user-1");

    expect(deleteObjectCtor).toHaveBeenCalledWith({ Bucket: "param-adventures-media", Key: "avatars/user-1" });
    expect(result).toBe(true);
  });

  it("returns false when delete throws", async () => {
    sendMock.mockRejectedValue(new Error("access denied"));
    const provider = new S3Provider(config);

    const result = await provider.delete("avatars/missing");

    expect(result).toBe(false);
  });

  it("generates a presigned upload URL and the matching final URL", async () => {
    getSignedUrlMock.mockResolvedValue("https://presigned.example.com/upload?sig=abc");
    const provider = new S3Provider(config);

    const data = await provider.getPresignData("my photo.png", "image/png");

    expect(data.provider).toBe("s3");
    expect(data.uploadUrl).toBe("https://presigned.example.com/upload?sig=abc");
    expect(data.finalUrl).toMatch(/^https:\/\/param-adventures-media\.s3\.ap-south-1\.amazonaws\.com\/uploads\/\d+-my_photo\.png$/);
  });

  it("strips path traversal and directory components from the filename", async () => {
    getSignedUrlMock.mockResolvedValue("https://presigned.example.com/upload?sig=abc");
    const provider = new S3Provider(config);

    const data = await provider.getPresignData("../../etc/passwd", "text/plain");

    expect(data.finalUrl).toMatch(/^https:\/\/param-adventures-media\.s3\.ap-south-1\.amazonaws\.com\/uploads\/\d+-passwd$/);
  });

  it("replaces unsafe characters while preserving a normal extension", async () => {
    getSignedUrlMock.mockResolvedValue("https://presigned.example.com/upload?sig=abc");
    const provider = new S3Provider(config);

    const data = await provider.getPresignData("weird<>:name?.jpg", "image/jpeg");

    expect(data.finalUrl).toMatch(/^https:\/\/param-adventures-media\.s3\.ap-south-1\.amazonaws\.com\/uploads\/\d+-weird___name_\.jpg$/);
  });
});
