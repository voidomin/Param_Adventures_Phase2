import { prisma } from "@/lib/db";
import { MediaProvider } from "./providers/base";
import { CloudinaryProvider } from "./providers/cloudinary";
import { S3Provider } from "./providers/s3";

class MediaFactory {
  /**
   * Resolve the active media provider from the database.
   */
  async getProvider(): Promise<MediaProvider> {
    const settings = await prisma.platformSetting.findMany({
      where: {
        key: {
          in: [
            "media_provider",
            "cloudinary_cloud_name",
            "cloudinary_api_key",
            "cloudinary_api_secret",
            "s3_bucket",
            "s3_region",
            "s3_access_key",
            "s3_secret_key",
          ],
        },
      },
    });

    const config = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    const providerType = config.media_provider || "CLOUDINARY";

    switch (providerType) {
      case "AWS_S3":
        if (!config.s3_access_key) throw new Error("S3 Access Key is missing in Platform Settings.");
        return new S3Provider({
          bucket: config.s3_bucket,
          region: config.s3_region || "ap-south-1",
          accessKeyId: config.s3_access_key,
          secretAccessKey: config.s3_secret_key,
        });

      case "CLOUDINARY":
      default:
        return new CloudinaryProvider({
          cloudName: config.cloudinary_cloud_name || process.env.CLOUDINARY_CLOUD_NAME || "",
          apiKey: config.cloudinary_api_key || process.env.CLOUDINARY_API_KEY || "",
          apiSecret: config.cloudinary_api_secret || process.env.CLOUDINARY_API_SECRET || "",
        });
    }
  }
}

export const mediaFactory = new MediaFactory();
