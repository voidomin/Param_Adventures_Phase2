import { v2 as cloudinary } from "cloudinary";
import { MediaProvider, MediaUploadResult, UploadOptions } from "./base";

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export class CloudinaryProvider implements MediaProvider {
  private readonly config: CloudinaryConfig;

  constructor(config: CloudinaryConfig) {
    this.config = config;
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      secure: true,
    });
  }

  async upload(buffer: Buffer, options: UploadOptions = {}): Promise<MediaUploadResult> {
    return new Promise((resolve, reject) => {
      const uploadOptions: Record<string, unknown> = {
        folder: options.folder ?? "param-adventures",
        resource_type: options.resource_type ?? "auto",
        public_id: options.public_id,
      };

      if (options.resource_type === "image") {
        uploadOptions.quality = "auto";
        uploadOptions.fetch_format = "auto";
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error || !result) {
            reject(new Error(error?.message || "Cloudinary upload failed"));
          } else {
            resolve({
              public_id: result.public_id,
              secure_url: result.secure_url,
              resource_type: result.resource_type as any,
              format: result.format,
              bytes: result.bytes,
              width: result.width,
              height: result.height,
            });
          }
        }
      );
      uploadStream.end(buffer);
    });
  }

  async delete(publicId: string, resourceType: string = "image"): Promise<boolean> {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      return true;
    } catch (error) {
      console.error("Cloudinary delete error:", error);
      return false;
    }
  }

  async getPresignData(fileName: string, contentType: string): Promise<any> {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = "param-adventures";
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      this.config.apiSecret
    );

    return {
      provider: "cloudinary",
      timestamp,
      signature,
      apiKey: this.config.apiKey,
      cloudName: this.config.cloudName,
      folder,
    };
  }
}
