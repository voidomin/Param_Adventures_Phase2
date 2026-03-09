import { useState, useCallback } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import ImageCropper from "./ImageCropper";

// ... [rest of the helper functions remain same until MediaUploader] ...
async function uploadToCloudinaryDirect(
  file: File | Blob,
  uploadData: Record<string, any>,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const CHUNK_SIZE = 99 * 1024 * 1024;
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

  // Chunked Upload Logic
  const uniqueId = crypto.randomUUID();
  let start = 0;
  let secureUrl = "";

  while (start < totalSize) {
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunk = file.slice(start, end);
    const isLastChunk = end === totalSize;

    secureUrl = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      // For blobs from cropper, we might not have a name, so use a default
      const fileName = (file as File).name || "cropped-image.jpg";
      formData.append("file", chunk, fileName);
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
            else resolve("");
          } else {
            reject(
              new Error(
                data.error?.message ||
                  `Chunk upload failed at byte ${currentStart}`,
              ),
            );
          }
        } catch (e: any) {
          reject(
            new Error(`Failed to parse Cloudinary response: ${e.message}`),
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
  file: File | Blob,
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

async function uploadSingleFile(
  file: File | Blob,
  apiPrefix: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");

  if (!isImage && !isVideo) {
    throw new Error("Only images and videos are supported.");
  }

  const fileName = (file as File).name || "upload";
  const presignRes = await fetch(`${apiPrefix}/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: fileName,
      contentType: file.type,
    }),
  });

  if (!presignRes.ok) {
    throw new Error(
      `Failed to get upload authorization (Status ${presignRes.status}).`,
    );
  }

  const uploadData = await presignRes.json();

  const uploadedUrl =
    uploadData.provider === "cloudinary"
      ? await uploadToCloudinaryDirect(file, uploadData, onProgress)
      : await uploadToS3Direct(file, uploadData, onProgress);

  if (onProgress) onProgress(100);

  const registerRes = await fetch(`${apiPrefix}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: uploadedUrl,
      type: isVideo ? "VIDEO" : "IMAGE",
    }),
  });

  if (!registerRes.ok) {
    throw new Error(
      `Failed to register media in database (Status ${registerRes.status}).`,
    );
  }

  await registerRes.json();
  return uploadedUrl;
}

export default function MediaUploader({
  id = "media-upload",
  apiPrefix = "/api/admin/media",
  onUploadSuccess,
  aspectRatio,
  shouldCrop = false,
}: Readonly<{
  id?: string;
  apiPrefix?: string;
  onUploadSuccess?: (urls?: string[]) => void;
  aspectRatio?: number;
  shouldCrop?: boolean;
}>) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // States for cropping
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);

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
      handleInitialFile(files[0], Array.from(files));
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleInitialFile(files[0], Array.from(files));
    }
  };

  const handleInitialFile = (primaryFile: File, allFiles: File[]) => {
    const isImage = primaryFile.type.startsWith("image/");

    // If we have a single image and cropping is enabled
    if (shouldCrop && isImage && allFiles.length === 1) {
      setPendingFile(primaryFile);
      const url = URL.createObjectURL(primaryFile);
      setCropImageUrl(url);
    } else {
      handleFiles(allFiles);
    }
  };

  const handleFiles = async (files: (File | Blob)[]) => {
    setError(null);
    setIsUploading(true);
    setProgress(0);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        uploadedUrls.push(
          await uploadSingleFile(file, apiPrefix, (p) => setProgress(p)),
        );
      }
      if (onUploadSuccess) onUploadSuccess(uploadedUrls);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const onCropComplete = (croppedBlob: Blob) => {
    // Revoke the temporary object URL
    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);
    setCropImageUrl(null);
    setPendingFile(null);

    // Upload the cropped blob
    handleFiles([croppedBlob]);
  };

  const onCropCancel = () => {
    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);
    setCropImageUrl(null);
    setPendingFile(null);
  };

  return (
    <div className="w-full">
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
          multiple={!shouldCrop}
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
                {shouldCrop ? "Upload & Crop" : "Drag & drop files here"}
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
        </div>
      )}

      {cropImageUrl && (
        <ImageCropper
          image={cropImageUrl}
          aspectRatio={aspectRatio ?? 1}
          onCropComplete={onCropComplete}
          onCancel={onCropCancel}
        />
      )}
    </div>
  );
}
