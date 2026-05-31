"use client";

import { useState, useEffect } from "react";
import MediaUploader from "@/components/admin/MediaUploader";
import { Trash2, Copy, CheckCircle2, Image as ImageIcon, GitMerge, X, Loader2 } from "lucide-react";
import Image from "next/image";

interface MediaItem {
  id: string;
  originalUrl: string;
  type: string;
  createdAt: string;
  uploadedBy: {
    name: string;
  };
  usages: { type: string; id: string; name: string }[];
  usageCount: number;
  fileHash?: string | null;
}

export default function MediaLibraryPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Deduplication & Filter states
  const [filterType, setFilterType] = useState<"ALL" | "UNUSED" | "IMAGE" | "VIDEO" | "DUPLICATES">("ALL");
  const [mergeSourceItem, setMergeSourceItem] = useState<MediaItem | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const [isMerging, setIsMerging] = useState(false);

  // Automatically select duplicate target if one is found by hash or URL
  useEffect(() => {
    if (mergeSourceItem) {
      const dup = media.find(
        (m) =>
          m.id !== mergeSourceItem.id &&
          m.type === mergeSourceItem.type &&
          ((mergeSourceItem.fileHash && m.fileHash && mergeSourceItem.fileHash === m.fileHash) ||
           (mergeSourceItem.originalUrl === m.originalUrl))
      );
      if (dup) {
        setMergeTargetId(dup.id);
      } else {
        setMergeTargetId("");
      }
    } else {
      setMergeTargetId("");
    }
  }, [mergeSourceItem, media]);

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

  const handleMerge = async () => {
    if (!mergeSourceItem || !mergeTargetId) return;

    setIsMerging(true);
    try {
      const res = await fetch("/api/admin/media/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: mergeSourceItem.id,
          targetId: mergeTargetId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMergeSourceItem(null);
        setMergeTargetId("");
        fetchMedia();
        alert(data.message || "Media assets merged successfully.");
      } else {
        alert(data.error || "Failed to merge media assets.");
      }
    } catch (err) {
      console.error("Merge error:", err);
      alert("Network error during merge.");
    } finally {
      setIsMerging(false);
    }
  };

  function renderGallery() {
    if (isLoading) {
      return (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }

    const filteredMedia = media.filter((item) => {
      if (filterType === "UNUSED") return item.usageCount === 0;
      if (filterType === "IMAGE") return item.type === "IMAGE";
      if (filterType === "VIDEO") return item.type === "VIDEO";
      if (filterType === "DUPLICATES") {
        return media.some(
          (other) =>
            other.id !== item.id &&
            ((item.fileHash && other.fileHash && item.fileHash === other.fileHash) ||
             (item.originalUrl === other.originalUrl))
        );
      }
      return true;
    });

    if (filteredMedia.length === 0) {
      return (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-foreground/50">
          <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No media files found matching the filter.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredMedia.map((item) => {
          const isDuplicate = media.some(
            (other) =>
              other.id !== item.id &&
              ((item.fileHash && other.fileHash && item.fileHash === other.fileHash) ||
               (item.originalUrl === other.originalUrl))
          );

          return (
            <div
              key={item.id}
              className="group bg-card border border-border rounded-xl overflow-hidden hover:border-foreground/30 transition-all relative flex flex-col"
            >
              <div className="relative aspect-square bg-foreground/5">
                {item.type === "IMAGE" ? (
                  <div className="relative aspect-square w-full h-full">
                    <Image
                      src={item.originalUrl}
                      alt={item.originalUrl.split("/").pop() || "Media upload"}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
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
                    <div className="absolute top-2 left-2 pointer-events-none z-10">
                      <span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded-full uppercase tracking-wider font-bold backdrop-blur-xs border border-white/20">
                        Video
                      </span>
                    </div>
                  </div>
                )}

                {/* Overlay actions */}
                <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-xs z-20">
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
                    onClick={() => setMergeSourceItem(item)}
                    className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                    title="Merge & Replace references"
                  >
                    <GitMerge className="w-5 h-5" />
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

              <div className="p-3 mt-auto flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className="text-xs font-semibold text-foreground/80 truncate flex-1"
                    title={item.originalUrl}
                  >
                    {new URL(item.originalUrl).pathname.split("/").pop() || "image"}
                  </p>
                  <div className="flex gap-1 shrink-0">
                    {item.usageCount === 0 ? (
                      <span className="bg-green-500/10 text-green-600 dark:text-green-400 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-green-500/20 shadow-sm">
                        Unused
                      </span>
                    ) : (
                      <span
                        className="bg-primary/10 text-primary text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-primary/20 shadow-sm cursor-help"
                        title={item.usages.map((u) => `${u.type}: ${u.name}`).join("\n")}
                      >
                        {item.usageCount} {item.usageCount === 1 ? "usage" : "usages"}
                      </span>
                    )}
                    {isDuplicate && (
                      <span className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-yellow-500/20 shadow-sm">
                        Duplicate
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[10px] items-center text-foreground/40 flex justify-between border-t border-border/30 pt-1.5">
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  <span className="truncate ml-2 text-right">
                    {item.uploadedBy.name}
                  </span>
                </p>
              </div>
          </div>
          );
        })}
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

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-foreground">Gallery</h2>
        <div className="flex gap-1.5 bg-foreground/5 p-1 rounded-xl border border-border/50">
          {(["ALL", "UNUSED", "IMAGE", "VIDEO", "DUPLICATES"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
                filterType === t
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/60 hover:text-foreground hover:bg-foreground/2"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {renderGallery()}

      {/* Merge Modal */}
      {mergeSourceItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card w-full max-w-lg border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-foreground/2">
              <h3 className="font-heading font-bold text-lg text-foreground">Merge & Deduplicate Media</h3>
              <button
                onClick={() => {
                  setMergeSourceItem(null);
                  setMergeTargetId("");
                }}
                className="p-1.5 rounded-lg hover:bg-foreground/5 text-foreground/40 hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Duplicate to Delete</span>
                  <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted mb-2">
                      <Image
                        src={mergeSourceItem.originalUrl}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    </div>
                    <p className="text-xs text-foreground/60 truncate w-full">
                      {mergeSourceItem.originalUrl.split("/").pop()}
                    </p>
                    <p className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-wider">
                      {mergeSourceItem.usageCount} usages replaced
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-green-500">Target to Keep</span>
                  <div className="border border-green-500/20 bg-green-500/5 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                    {mergeTargetId ? (
                      (() => {
                        const target = media.find((m) => m.id === mergeTargetId);
                        return target ? (
                          <>
                            <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted mb-2">
                              <Image
                                src={target.originalUrl}
                                alt=""
                                fill
                                className="object-cover"
                              />
                            </div>
                            <p className="text-xs text-foreground/60 truncate w-full">
                              {target.originalUrl.split("/").pop()}
                            </p>
                            <p className="text-[10px] text-green-500 font-bold mt-1 uppercase tracking-wider">
                              {target.usageCount} current usages
                            </p>
                          </>
                        ) : null;
                      })()
                    ) : (
                      <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-foreground/20 text-xs font-semibold mb-2">
                        Select below
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider">
                  Select target image from library
                </label>
                <select
                  value={mergeTargetId}
                  onChange={(e) => setMergeTargetId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                >
                  <option value="">-- Choose Target Image --</option>
                  {media
                    .filter((m) => m.id !== mergeSourceItem.id && m.type === mergeSourceItem.type)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.originalUrl.split("/").pop()} ({m.usageCount} usages)
                      </option>
                    ))}
                </select>

                {mergeTargetId && (
                  (() => {
                    const target = media.find((m) => m.id === mergeTargetId);
                    const isMatch = target && (
                      (mergeSourceItem.fileHash && target.fileHash && mergeSourceItem.fileHash === target.fileHash) ||
                      (mergeSourceItem.originalUrl === target.originalUrl)
                    );
                    if (isMatch) {
                      return (
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                          <span>⚠️ Duplicate Detected: We found a matching duplicate asset by file signature and pre-selected it to make merging easy.</span>
                        </div>
                      );
                    }
                    return null;
                  })()
                )}
              </div>

              {mergeSourceItem.usages.length > 0 && (
                <div className="p-4 bg-foreground/3 border border-border rounded-xl">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-2">
                    Current Usages to be updated:
                  </span>
                  <ul className="text-xs space-y-1.5 max-h-32 overflow-y-auto pr-2">
                    {mergeSourceItem.usages.map((u, i) => (
                      <li
                        key={i}
                        className="flex justify-between items-center bg-background p-2 rounded-lg border border-border/50"
                      >
                        <span className="font-semibold text-foreground/80">{u.name}</span>
                        <span className="text-[10px] uppercase font-black tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {u.type}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-border/50">
                <button
                  onClick={() => {
                    setMergeSourceItem(null);
                    setMergeTargetId("");
                  }}
                  className="px-5 py-2.5 border border-border hover:bg-foreground/5 text-foreground rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMerge}
                  disabled={isMerging || !mergeTargetId}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 h-10"
                >
                  {isMerging ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Merging...
                    </>
                  ) : (
                    "Merge & Replace"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
