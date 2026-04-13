"use client";

import React, { useState } from "react";
import { X, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import MediaUploader from "./MediaUploader";
import { ASPECT_RATIOS } from "@/lib/constants/aspect-ratios";

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  videoUrl: string;
  ctaLink: string | null;
  isActive: boolean;
  order: number;
}

interface HeroFormProps {
  readonly slide: HeroSlide | null;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
}

export default function HeroForm({ slide, onClose, onSuccess }: HeroFormProps) {
  const isEditing = !!slide;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState(slide?.title || "");
  const [subtitle, setSubtitle] = useState(slide?.subtitle || "");
  const [videoUrl, setVideoUrl] = useState(slide?.videoUrl || "");
  const [ctaLink, setCtaLink] = useState(slide?.ctaLink || "");
  const [isActive, setIsActive] = useState(slide ? slide.isActive : true);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const url =
        isEditing && slide ? `/api/admin/hero/${slide.id}` : "/api/admin/hero";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subtitle,
          videoUrl,
          ctaLink,
          isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save slide");

      onSuccess();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-xl rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-border flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-foreground">
            {isEditing ? "Edit Hero Slide" : "Create Hero Slide"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-foreground/50 hover:text-foreground hover:bg-foreground/5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto min-h-0">
          <form id="hero-form" onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <div>
              <p className="block text-sm font-medium text-foreground/80 mb-1">
                Background Media (Image or Video)
              </p>
              {videoUrl ? (
                <div className="relative group rounded-xl overflow-hidden border border-border">
                  {/\.(mp4|webm|ogv)$/i.test(videoUrl) ||
                  videoUrl.includes("/video/upload/") ? (
                    <video
                      src={videoUrl}
                      className="w-full aspect-video object-cover"
                      muted
                      loop
                      autoPlay
                    />
                  ) : (
                    <div className="relative aspect-video w-full">
                    <Image
                      src={videoUrl}
                      alt="Hero background"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 800px"
                    />
                  </div>
                  )}
                  <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setVideoUrl("")}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium shadow-xl"
                    >
                      Remove Media
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <MediaUploader
                    shouldCrop={true}
                    aspectRatio={ASPECT_RATIOS.HERO_BANNER}
                    onUploadSuccess={(urls) => {
                      if (urls && urls.length > 0) {
                        setVideoUrl(urls[0]);
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <div className="h-px bg-border flex-1"></div>
                    <span className="text-xs text-foreground/40 font-medium uppercase">
                      or enter URL
                    </span>
                    <div className="h-px bg-border flex-1"></div>
                  </div>
                  <div className="flex gap-2 items-center bg-background border border-border rounded-xl px-3 py-2.5">
                    <label htmlFor="media-url-input">
                      <ImageIcon className="w-4 h-4 text-foreground/50" />
                    </label>
                    <input
                      id="media-url-input"
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full bg-transparent text-sm text-foreground focus:outline-none"
                      placeholder="https://example.com/media.mp4"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="slide-title"
                className="block text-sm font-medium text-foreground/80 mb-1"
              >
                Primary Title
              </label>
              <input
                id="slide-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
                placeholder="e.g. Discover the Himalayas"
              />
            </div>

            <div>
              <label
                htmlFor="slide-subtitle"
                className="block text-sm font-medium text-foreground/80 mb-1"
              >
                Subtitle / Description
              </label>
              <input
                id="slide-subtitle"
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
                placeholder="e.g. Join the ultimate trekking experience."
              />
            </div>

            <div>
              <label
                htmlFor="slide-cta"
                className="block text-sm font-medium text-foreground/80 mb-1"
              >
                Call to Action Link (Optional)
              </label>
              <input
                id="slide-cta"
                type="text"
                value={ctaLink}
                onChange={(e) => setCtaLink(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
                placeholder="e.g. /experiences/everest-base-camp"
              />
            </div>

            <div className="p-4 rounded-xl border border-border hover:bg-foreground/5 transition-colors flex items-center gap-3">
              <input
                id="slide-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-5 h-5 rounded border-border text-primary focus:ring-primary focus:ring-offset-background bg-background cursor-pointer"
              />
              <label htmlFor="slide-active" className="flex-1 cursor-pointer">
                <span className="block text-sm font-medium text-foreground">
                  Active Slide
                </span>
                <span className="block text-xs text-foreground/60">
                  Slide will be visible to the public.
                </span>
              </label>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3 shrink-0 bg-background/50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-full font-bold text-foreground/70 hover:bg-foreground/10 transition-colors"
          >
            Cancel
          </button>
          <button
            form="hero-form"
            type="submit"
            disabled={isSubmitting || !videoUrl}
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-primary/25"
          >
            {isSubmitting ? "Saving..." : "Save Slide"}
          </button>
        </div>
      </div>
    </div>
  );
}
