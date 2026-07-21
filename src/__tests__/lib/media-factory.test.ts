import { describe, it, expect, vi, beforeEach } from "vitest";
import { mediaFactory } from "@/lib/media/factory";
import { prisma } from "@/lib/db";
import { CloudinaryProvider } from "@/lib/media/providers/cloudinary";
import { S3Provider } from "@/lib/media/providers/s3";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    platformSetting: {
      findMany: vi.fn(),
    },
  },
}));

// Mock process.env
const originalEnv = process.env;

describe("MediaFactory Comprehensive Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it("returns CloudinaryProvider when media_provider is CLOUDINARY", async () => {
    vi.mocked(prisma.platformSetting.findMany).mockResolvedValue([
      { id: "1", key: "media_provider", value: "CLOUDINARY" },
      { id: "2", key: "cloudinary_cloud_name", value: "cloud-123" },
      { id: "3", key: "cloudinary_api_key", value: "api-key-123" },
      { id: "4", key: "cloudinary_api_secret", value: "api-secret-123" },
    ] as any);

    const provider = await mediaFactory.getProvider();
    expect(provider).toBeInstanceOf(CloudinaryProvider);
  });

  it("returns CloudinaryProvider by default when no setting is found", async () => {
    vi.mocked(prisma.platformSetting.findMany).mockResolvedValue([]);
    process.env.CLOUDINARY_CLOUD_NAME = "env-cloud";

    const provider = await mediaFactory.getProvider();
    expect(provider).toBeInstanceOf(CloudinaryProvider);
  });

  it("returns S3Provider when media_provider is S3", async () => {
    vi.mocked(prisma.platformSetting.findMany).mockResolvedValue([
      { id: "1", key: "media_provider", value: "S3" },
      { id: "2", key: "s3_bucket", value: "my-bucket" },
      { id: "3", key: "s3_region", value: "us-east-1" },
      { id: "4", key: "s3_access_key", value: "access-key-xyz" },
      { id: "5", key: "s3_secret_key", value: "secret-key-xyz" },
    ] as any);

    const provider = await mediaFactory.getProvider();
    expect(provider).toBeInstanceOf(S3Provider);
  });

  it("returns S3Provider when media_provider is AWS_S3", async () => {
    vi.mocked(prisma.platformSetting.findMany).mockResolvedValue([
      { id: "1", key: "media_provider", value: "AWS_S3" },
      { id: "2", key: "s3_bucket", value: "my-bucket" },
      { id: "4", key: "s3_access_key", value: "access-key-xyz" },
      { id: "5", key: "s3_secret_key", value: "secret-key-xyz" },
    ] as any);

    const provider = await mediaFactory.getProvider();
    expect(provider).toBeInstanceOf(S3Provider);
  });

  it("throws error if S3 access key is missing", async () => {
    vi.mocked(prisma.platformSetting.findMany).mockResolvedValue([
      { id: "1", key: "media_provider", value: "S3" },
      { id: "2", key: "s3_bucket", value: "my-bucket" },
    ] as any);

    await expect(mediaFactory.getProvider()).rejects.toThrow(
      "S3 Access Key is missing in Platform Settings."
    );
  });
});
