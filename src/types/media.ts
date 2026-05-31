export interface MediaSettings {
  provider: "CLOUDINARY" | "AWS_S3" | "S3" | "LOCAL";
  cloudinaryCloudName?: string;
  s3Bucket?: string;
  s3Region?: string;
  globalQuality?: number;
  highFidelity?: boolean;
  cdnUrl?: string;
}
