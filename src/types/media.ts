export interface MediaSettings {
  provider: "CLOUDINARY" | "AWS_S3";
  cloudinaryCloudName?: string;
  s3Bucket?: string;
  s3Region?: string;
  globalQuality?: number;
  highFidelity?: boolean;
}
