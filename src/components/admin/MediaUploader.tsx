"use client";

import { useState, useCallback } from "react";
import { UploadCloud, Loader2 } from "lucide-react";

export default function MediaUploader({
  onUploadSuccess,
}: Readonly<{
  onUploadSuccess?: (urls?: string[]) => void;
}>) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  async function uploadSingleFile(file: File): Promise<string> {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      throw new Error("Only images and videos are supported.");
    }

    const presignRes = await fetch("/api/admin/media/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, contentType: file.type }),
    });
    const presignData = await presignRes.json();
    if (!presignRes.ok)
      throw new Error(presignData.error || "Failed to presign");

    const { uploadUrl, finalUrl } = presignData;

    if (uploadUrl !== "MOCK_UPLOAD") {
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) throw new Error(`Failed to upload ${file.name} to S3`);
    }

    const dbRes = await fetch("/api/admin/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalUrl: finalUrl,
        type: file.type.startsWith("video/") ? "VIDEO" : "IMAGE",
      }),
    });
    if (!dbRes.ok) throw new Error("Failed to save to database");

    return finalUrl;
  }

  const handleFiles = async (files: File[]) => {
    setError(null);
    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        uploadedUrls.push(await uploadSingleFile(file));
      }
      if (onUploadSuccess) onUploadSuccess(uploadedUrls);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop files here or click to upload"
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-foreground/30 bg-background"
        } ${isUploading ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            document.getElementById("media-upload")?.click();
          }
        }}
      >
        <input
          type="file"
          id="media-upload"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileInput}
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-foreground font-medium">Uploading media...</p>
          </div>
        ) : (
          <label
            htmlFor="media-upload"
            className="flex flex-col items-center justify-center gap-4 cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center text-foreground/50">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <p className="text-foreground font-heading font-bold text-lg">
                Drag & drop files here
              </p>
              <p className="text-sm text-foreground/60 mt-1">
                or click to browse your computer
              </p>
            </div>
            <div className="text-xs text-foreground/40 mt-2">
              Supports: JPG, PNG, WEBP, GIF, MP4 (Max 10MB)
            </div>
          </label>
        )}
      </div>

      {error && (
        <p className="text-red-500 text-sm mt-3 font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/20">
          {error}
        </p>
      )}
    </div>
  );
}
