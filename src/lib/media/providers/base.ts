export interface UploadOptions {
  folder?: string;
  resource_type?: "image" | "video" | "auto";
  public_id?: string;
}

export interface MediaUploadResult {
  public_id: string;
  secure_url: string;
  resource_type: "image" | "video" | "raw";
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}

export interface MediaProvider {
  upload(buffer: Buffer, options?: UploadOptions): Promise<MediaUploadResult>;
  delete(publicId: string, resourceType?: string): Promise<boolean>;
  getPresignData(fileName: string, contentType: string): Promise<Record<string, unknown>>;
}
