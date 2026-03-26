"use client";

import { useState, useEffect } from "react";
import MediaUploader from "@/components/admin/MediaUploader";
import { Trash2, Copy, CheckCircle2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

interface MediaItem {
  id: string;
  originalUrl: string;
  type: string;
  createdAt: string;
  uploadedBy: {
    name: string;
  };
}

export default function MediaLibraryPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchMedia = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/media");
      if (res.ok) {
        const data = await res.json();
        setMedia(data.images);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleDelete = async (id: string) => {
    if (!globalThis.confirm("Are you sure you want to delete this media file?"))
      return;

    try {
      const res = await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchMedia();
      } else {
        alert("Failed to delete media");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting media");
    }
  };

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleVideoMouseEnter = (e: React.MouseEvent<HTMLVideoElement>) => {
    const video = e.target as HTMLVideoElement;
    video.play().catch(() => {});
  };

  const handleVideoMouseLeave = (e: React.MouseEvent<HTMLVideoElement>) => {
    const video = e.target as HTMLVideoElement;
    video.pause();
  };

  function renderGallery() {
    if (isLoading) {
      return (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }
    if (media.length === 0) {
      return (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-foreground/50">
          <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Your media library is currently empty.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {media.map((item) => (
          <div
            key={item.id}
            className="group bg-card border border-border rounded-xl overflow-hidden hover:border-foreground/30 transition-colors"
          >
            <div className="relative aspect-square bg-foreground/5">
              {item.type === "IMAGE" ? (
                <div className="relative aspect-square">
                  <Image
                    src={item.originalUrl}
                    alt={item.originalUrl.split("/").pop() || "Media upload"}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
              ) : (
                <div className="relative w-full h-full bg-black">
                  <video
                    src={item.originalUrl}
                    className="w-full h-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                    muted
                    loop
                    playsInline
                    onMouseEnter={handleVideoMouseEnter}
                    onMouseLeave={handleVideoMouseLeave}
                  />
                  <div className="absolute top-2 left-2 pointer-events-none">
                    <span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded-full uppercase tracking-wider font-bold backdrop-blur-sm shadow-sm border border-white/20">
                      Video
                    </span>
                  </div>
                </div>
              )}

              {/* Overlay actions */}
              <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                <button
                  onClick={() => copyToClipboard(item.originalUrl, item.id)}
                  className="p-2 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-lg transition-colors"
                  title="Copy URL"
                >
                  {copiedId === item.id ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-3">
              <p
                className="text-xs text-foreground/60 truncate"
                title={item.originalUrl}
              >
                {new URL(item.originalUrl).pathname.split("/").pop() || "image"}
              </p>
              <p className="text-[10px] items-center text-foreground/40 mt-1 flex justify-between">
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                <span className="truncate ml-2 text-right">
                  {item.uploadedBy.name}
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-foreground">
          Media Library
        </h1>
        <p className="text-foreground/60 mt-1">
          Manage all the images and videos uploaded to your Experiences.
        </p>
      </div>

      <div className="mb-10">
        <MediaUploader onUploadSuccess={fetchMedia} />
      </div>

      <h2 className="text-xl font-bold text-foreground mb-6">Gallery</h2>

      {renderGallery()}
    </div>
  );
}
