"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { getMediaUrl } from "@/lib/media/media-gateway";

interface ExperienceGalleryProps {
  readonly images: string[];
  readonly mediaSettings?: any;
}

export default function ExperienceGallery({ 
  images, 
  mediaSettings 
}: ExperienceGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter out any potential empty strings
  const galleryImages = images.filter((img) => img !== "");

  // Show at most 24 images initially (which is 6 rows on mobile, 2 rows on XL desktop)
  const INITIAL_VISIBLE_COUNT = 24;
  const visibleImages = isExpanded
    ? galleryImages
    : galleryImages.slice(0, INITIAL_VISIBLE_COUNT);

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
  };

  const closeLightbox = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  // Handle body scroll locking
  useEffect(() => {
    if (selectedIndex === null) {
      document.body.style.overflow = "unset";
    } else {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedIndex]);

  const showNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (selectedIndex !== null) {
        setSelectedIndex((prev) =>
          prev === null ? 0 : (prev + 1) % galleryImages.length,
        );
      }
    },
    [selectedIndex, galleryImages.length],
  );

  const showPrev = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (selectedIndex !== null) {
        setSelectedIndex((prev) =>
          prev === null
            ? 0
            : (prev - 1 + galleryImages.length) % galleryImages.length,
        );
      }
    },
    [selectedIndex, galleryImages.length],
  );

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") showNext();
      if (e.key === "ArrowLeft") showPrev();
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, closeLightbox, showNext, showPrev]);

  if (galleryImages.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
        {visibleImages.map((url, index) => {
          const isVideo = /\.(mp4|webm)$/i.exec(url);
          const thumbnailUrl = getMediaUrl(
            url,
            mediaSettings?.provider || "CLOUDINARY",
            {
              cloudinaryCloudName: mediaSettings?.cloudinaryCloudName,
              s3Bucket: mediaSettings?.s3Bucket,
              s3Region: mediaSettings?.s3Region,
              globalQuality: mediaSettings?.globalQuality || 95,
              highFidelity: mediaSettings?.highFidelity ?? true
            },
            { width: 400, crop: "fill" }
          );

          return (
            <motion.div
              key={url}
              layoutId={`gallery-${url}`}
              role="button"
              tabIndex={0}
              aria-label={`View image ${index + 1}`}
              className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer ring-1 ring-border/50 hover:ring-primary/50 transition-all shadow-sm hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={() => openLightbox(index)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openLightbox(index);
                }
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isVideo ? (
                <video
                  src={thumbnailUrl}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  muted
                  loop
                  autoPlay
                  playsInline
                />
              ) : (
                <Image
                  src={thumbnailUrl}
                  alt={`Item ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              )}
              <div className="absolute inset-0 bg-black/5 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <Maximize2 className="w-4 h-4 text-white" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {galleryImages.length > INITIAL_VISIBLE_COUNT && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center gap-2 px-8 py-2.5 rounded-full bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-all border border-primary/20 hover:scale-105"
          >
            {isExpanded
              ? "Show Less"
              : `See All ${galleryImages.length} Photos`}
          </button>
        </div>
      )}

      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 md:p-8"
            onClick={closeLightbox}
          >
            {/* Close Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ delay: 0.1 }}
              onClick={closeLightbox}
              aria-label="Close lightbox"
              className="absolute top-6 right-6 z-[110] p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10"
            >
              <X className="w-6 h-6" />
            </motion.button>

            {/* Navigation Buttons */}
            {galleryImages.length > 1 && (
              <>
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={showPrev}
                  aria-label="Previous image"
                  className="absolute left-6 z-[110] p-4 rounded-full bg-white/5 text-white hover:bg-white/20 transition-all border border-white/5 hover:scale-110"
                >
                  <ChevronLeft className="w-8 h-8" />
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onClick={showNext}
                  aria-label="Next image"
                  className="absolute right-6 z-[110] p-4 rounded-full bg-white/5 text-white hover:bg-white/20 transition-all border border-white/5 hover:scale-110"
                >
                  <ChevronRight className="w-8 h-8" />
                </motion.button>
              </>
            )}

            {/* Content Display */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full h-full flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            >
              {selectedIndex !== null && (
                (() => {
                  const currentImage = galleryImages[selectedIndex];
                  const fullUrl = getMediaUrl(
                    currentImage,
                    mediaSettings?.provider || "CLOUDINARY",
                    {
                      cloudinaryCloudName: mediaSettings?.cloudinaryCloudName,
                      s3Bucket: mediaSettings?.s3Bucket,
                      s3Region: mediaSettings?.s3Region,
                      globalQuality: mediaSettings?.globalQuality || 100,
                      highFidelity: mediaSettings?.highFidelity ?? true
                    }
                  );

                  return /\.(mp4|webm)$/i.exec(currentImage) ? (
                    <video
                      src={fullUrl}
                      className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
                      controls
                      autoPlay
                      playsInline
                    >
                      <track kind="captions" />
                    </video>
                  ) : (
                    <div className="relative w-full h-[80vh]">
                      <Image
                        src={fullUrl}
                        alt={`Item detail ${selectedIndex + 1}`}
                        fill
                        sizes="100vw"
                        className="object-contain"
                      />
                    </div>
                  );
                })()
              )}
            </motion.div>

            {/* Image Counter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.1 }}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-white/10 text-white/80 font-medium text-sm border border-white/10 backdrop-blur-md"
            >
              {selectedIndex + 1} / {galleryImages.length}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
