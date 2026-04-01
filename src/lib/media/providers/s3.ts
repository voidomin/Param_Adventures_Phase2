import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { MediaProvider, MediaUploadResult, UploadOptions } from "./base";

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class S3Provider implements MediaProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(config: S3Config) {
    this.client = new S3Client({
      region: config.region || "ap-south-1",
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.bucket = config.bucket;
    this.region = config.region;
  }

  async upload(buffer: Buffer, options: UploadOptions = {}): Promise<MediaUploadResult> {
    const key = `${options.folder || "uploads"}/${options.public_id || Date.now()}`;
    
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: options.resource_type === "image" ? "image/jpeg" : "application/octet-stream",
    }));

    return {
      public_id: key,
      secure_url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
      resource_type: (options.resource_type || "auto") as "image" | "video" | "raw",
      format: "unknown",
      bytes: buffer.length,
    };
  }

  async delete(publicId: string): Promise<boolean> {
    try {
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: publicId,
      }));
      return true;
    } catch (error) {
      console.error("S3 delete error:", error);
      return false;
    }
  }

  async getPresignData(fileName: string, contentType: string): Promise<Record<string, unknown>> {
    const key = `uploads/${Date.now()}-${fileName.replaceAll(/\s+/g, "_")}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: 3600 });
    const finalUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    return {
      provider: "s3",
      uploadUrl,
      finalUrl,
    };
  }
}
