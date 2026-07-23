import { describe, it, expect, vi, beforeEach } from "vitest";

const { configMock, uploadStreamMock, destroyMock, apiSignRequestMock } = vi.hoisted(() => ({
  configMock: vi.fn(),
  uploadStreamMock: vi.fn(),
  destroyMock: vi.fn(),
  apiSignRequestMock: vi.fn(),
}));

vi.mock("cloudinary", () => ({
  v2: {
    config: configMock,
    uploader: {
      upload_stream: uploadStreamMock,
      destroy: destroyMock,
    },
    utils: {
      api_sign_request: apiSignRequestMock,
    },
  },
}));

import { CloudinaryProvider } from "@/lib/media/providers/cloudinary";

describe("CloudinaryProvider", () => {
  const config = { cloudName: "demo", apiKey: "key123", apiSecret: "secret456" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("configures the cloudinary SDK on construction", () => {
    new CloudinaryProvider(config);

    expect(configMock).toHaveBeenCalledWith({
      cloud_name: "demo",
      api_key: "key123",
      api_secret: "secret456",
      secure: true,
    });
  });

  it("uploads a buffer and resolves with the mapped result", async () => {
    uploadStreamMock.mockImplementation((_options, callback) => ({
      end: () => {
        callback(null, {
          public_id: "param-adventures/abc",
          secure_url: "https://res.cloudinary.com/demo/abc.jpg",
          resource_type: "image",
          format: "jpg",
          bytes: 1024,
          width: 800,
          height: 600,
        });
      },
    }));
    const provider = new CloudinaryProvider(config);

    const result = await provider.upload(Buffer.from("fake-image-data"), { resource_type: "image" });

    expect(result).toEqual({
      public_id: "param-adventures/abc",
      secure_url: "https://res.cloudinary.com/demo/abc.jpg",
      resource_type: "image",
      format: "jpg",
      bytes: 1024,
      width: 800,
      height: 600,
    });
  });

  it("applies quality/format auto-optimization only for image uploads", async () => {
    uploadStreamMock.mockImplementation((_options, callback) => ({
      end: () => callback(null, { public_id: "x", secure_url: "y", resource_type: "image", format: "jpg", bytes: 1 }),
    }));
    const provider = new CloudinaryProvider(config);

    await provider.upload(Buffer.from("data"), { resource_type: "image" });

    const uploadOptions = uploadStreamMock.mock.calls[0][0];
    expect(uploadOptions.quality).toBe("auto");
    expect(uploadOptions.fetch_format).toBe("auto");
  });

  it("rejects when the Cloudinary upload callback returns an error", async () => {
    uploadStreamMock.mockImplementation((_options, callback) => ({
      end: () => callback({ message: "upload rejected" }, null),
    }));
    const provider = new CloudinaryProvider(config);

    await expect(provider.upload(Buffer.from("data"))).rejects.toThrow("upload rejected");
  });

  it("deletes successfully and returns true", async () => {
    destroyMock.mockResolvedValue({ result: "ok" });
    const provider = new CloudinaryProvider(config);

    const result = await provider.delete("param-adventures/abc", "video");

    expect(destroyMock).toHaveBeenCalledWith("param-adventures/abc", { resource_type: "video" });
    expect(result).toBe(true);
  });

  it("returns false when delete throws", async () => {
    destroyMock.mockRejectedValue(new Error("not found"));
    const provider = new CloudinaryProvider(config);

    const result = await provider.delete("missing/id");

    expect(result).toBe(false);
  });

  it("generates presign data using the configured secret", async () => {
    apiSignRequestMock.mockReturnValue("signed-abc123");
    const provider = new CloudinaryProvider(config);

    const data = await provider.getPresignData();

    expect(data.provider).toBe("cloudinary");
    expect(data.signature).toBe("signed-abc123");
    expect(data.apiKey).toBe("key123");
    expect(data.cloudName).toBe("demo");
    expect(apiSignRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({ folder: "param-adventures" }),
      "secret456",
    );
  });
});
