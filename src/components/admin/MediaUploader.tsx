"use client";

import { useState, useCallback } from "react";
import { UploadCloud, Loader2 } from "lucide-react";

async function uploadToCloudinaryDirect(
  file: File,
  uploadData: Record<string, any>,
  onProgress?: (percent: number) => void,
): Promise<string> {
  // Cloudinary standard upload limit is 100MB.
  // We only chunk if the file is larger than 100MB to preserve TCP throughput
  // and prevent high-latency connection overheads from sequential HTTP requests.
  const CHUNK_SIZE = 99 * 1024 * 1024; // 99MB chunk limit
  const totalSize = file.size;

  if (totalSize <= CHUNK_SIZE) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", uploadData.apiKey);
      formData.append("timestamp", uploadData.timestamp.toString());
      formData.append("signature", uploadData.signature);
      formData.append("folder", uploadData.folder);

      const resType = file.type.startsWith("video/") ? "video" : "image";
      const url = `https://api.cloudinary.com/v1_1/${uploadData.cloudName}/${resType}/upload`;

      xhr.open("POST", url, true);
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(data.secure_url);
          else
            reject(
              new Error(data.error?.message || "Cloudinary upload failed"),
            );
        } catch (e: any) {
          console.error("Cloudinary upload parse error:", e);
          reject(
            new Error(`Failed to parse Cloudinary response: ${e.message}`),
          );
        }
      };
      xhr.onerror = () =>
        reject(new Error("Network error during Cloudinary upload"));
      xhr.send(formData);
    });
  }

  // Chunked Upload Logic - Use cryptographically secure UUID for Cloudinary chunks
  const uniqueId = crypto.randomUUID();
  let start = 0;
  let secureUrl = "";

  while (start < totalSize) {
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunk = file.slice(start, end);
    const isLastChunk = end === totalSize;

    // eslint-disable-next-line no-await-in-loop
    secureUrl = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      // Crucial: Pass the original filename. Without it, the browser sends "blob",
      // forcing Cloudinary to synchronously probe the video format, causing huge delays.
      formData.append("file", chunk, file.name);
      formData.append("api_key", uploadData.apiKey);
      formData.append("timestamp", uploadData.timestamp.toString());
      formData.append("signature", uploadData.signature);
      formData.append("folder", uploadData.folder);

      const resType = file.type.startsWith("video/") ? "video" : "image";
      const url = `https://api.cloudinary.com/v1_1/${uploadData.cloudName}/${resType}/upload`;

      xhr.open("POST", url, true);
      xhr.setRequestHeader("X-Unique-Upload-Id", uniqueId);
      xhr.setRequestHeader(
        "Content-Range",
        `bytes ${start}-${end - 1}/${totalSize}`,
      );

      const currentStart = start;
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable && onProgress) {
          const chunkProgress = (e.loaded / e.total) * (end - currentStart);
          const totalProgress = Math.round(
            ((currentStart + chunkProgress) / totalSize) * 100,
          );
          onProgress(totalProgress);
        }
      });

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            if (isLastChunk) resolve(data.secure_url);
            else resolve(""); // Not finished yet
          } else {
            reject(
              new Error(
                data.error?.message ||
                  `Chunk upload failed at byte ${currentStart}`,
              ),
            );
          }
        } catch (e: any) {
          console.error("Cloudinary chunk upload parse error:", e);
          reject(
            new Error(
              `Failed to parse Cloudinary response during chunked upload: ${e.message}`,
            ),
          );
        }
      };
      xhr.onerror = () =>
        reject(new Error("Network error during chunked upload"));
      xhr.send(formData);
    });

    start = end;
  }

  return secureUrl;
}

async function uploadToS3Direct(
  file: File,
  uploadData: Record<string, any>,
  onProgress?: (percent: number) => void,
): Promise<string> {
  if (uploadData.uploadUrl === "MOCK_UPLOAD") {
    if (onProgress) onProgress(100);
    return uploadData.finalUrl;
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadData.uploadUrl, true);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(uploadData.finalUrl);
      } else {
        reject(new Error(`S3 upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during S3 upload"));
    xhr.send(file);
  });
}

// Module-level helper — uploads file via direct cloud flow with progress support
async function uploadSingleFile(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");

  if (!isImage && !isVideo) {
    throw new Error("Only images and videos are supported.");
  }

  // 1. Get Presigned Data/URL
  const presignRes = await fetch("/api/admin/media/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
    }),
  });

  const uploadData = await presignRes.json();
  if (!presignRes.ok)
    throw new Error(uploadData.error || "Failed to get upload authorization");

  // 2. Direct Upload (Provider Specific)
  const uploadedUrl =
    uploadData.provider === "cloudinary"
      ? await uploadToCloudinaryDirect(file, uploadData, onProgress)
      : await uploadToS3Direct(file, uploadData, onProgress);

  // 100% progress before DB registration
  if (onProgress) onProgress(100);

  // 3. Register Media in Database
  const registerRes = await fetch("/api/admin/media/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: uploadedUrl,
      type: isVideo ? "VIDEO" : "IMAGE",
    }),
  });

  const registerData = await registerRes.json();
  if (!registerRes.ok) {
    throw new Error(
      registerData.error || "Failed to register media in database",
    );
  }

  return uploadedUrl;
}

export default function MediaUploader({
  id = "media-upload",
  onUploadSuccess,
}: Readonly<{
  id?: string;
  onUploadSuccess?: (urls?: string[]) => void;
}>) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
  };

  const handleFiles = async (files: File[]) => {
    setError(null);
    setIsUploading(true);
    setProgress(0);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        uploadedUrls.push(await uploadSingleFile(file, (p) => setProgress(p)));
      }
      if (onUploadSuccess) onUploadSuccess(uploadedUrls);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="w-full">
      {/* Native label wraps a hidden file input — natively interactive, no ARIA needed */}
      <label
        htmlFor={id}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-colors block ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-foreground/30 bg-background"
        } ${isUploading ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id={id}
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileInput}
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative w-16 h-16">
              <Loader2 className="absolute inset-0 w-full h-full text-primary animate-spin opacity-20" />
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary">
                {progress}%
              </div>
            </div>
            <div className="w-full max-w-[200px]">
              <p className="text-foreground font-medium mb-2">Uploading...</p>
              <div className="h-1.5 w-full bg-foreground/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out fill-mode-forwards"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center text-foreground/50">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <p className="text-foreground font-heading font-bold text-lg">
                Drag &amp; drop files here
              </p>
              <p className="text-sm text-foreground/60 mt-1">
                or click to browse your computer
              </p>
            </div>
            <div className="text-xs text-foreground/40 mt-2">
              Supports: JPG, PNG, WEBP, GIF, MP4 (Max 200MB)
            </div>
          </div>
        )}
      </label>

      {error && (
        <div className="mt-3">
          <p className="text-red-500 text-sm font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/20">
            Error: {error}
          </p>
          <p className="text-[10px] text-foreground/30 mt-1 px-1">
            Try a smaller file or a different format if the problem persists.
          </p>
        </div>
      )}
    </div>
  );
}
