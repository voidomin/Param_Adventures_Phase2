import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  resource_type: "image" | "video" | "raw";
  format: string;
  width?: number;
  height?: number;
  bytes: number;
}

/**
 * Upload a file buffer directly to Cloudinary.
 * Returns the secure URL and metadata.
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  options: {
    folder?: string;
    resource_type?: "image" | "video" | "auto";
    public_id?: string;
  } = {},
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder ?? "param-adventures",
        resource_type: options.resource_type ?? "auto",
        public_id: options.public_id,
        // Auto-optimize: compress images, strip metadata
        quality: "auto",
        fetch_format: "auto",
      },
      (error, result) => {
        if (error || !result) {
          reject(
            error instanceof Error
              ? error
              : new Error(error?.message || "Cloudinary upload failed"),
          );
        } else {
          resolve(result as CloudinaryUploadResult);
        }
      },
    );
    uploadStream.end(buffer);
  });
}

/**
 * Delete an asset from Cloudinary by its public_id.
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: "image" | "video" | "raw" = "image",
): Promise<boolean> {
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

export default cloudinary;
