"use client";

import React, { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { X, Crop, Check, Loader2 } from "lucide-react";

interface ImageCropperProps {
  readonly image: string;
  readonly aspectRatio: number;
  readonly onCropComplete: (croppedImage: Blob) => void;
  readonly onCancel: () => void;
  /** "round" matches contexts where the result is displayed as a circle (e.g. avatars). */
  readonly cropShape?: "rect" | "round";
  /** Caps the longer edge of the exported image so a huge source photo doesn't
   * produce a needlessly large upload (e.g. a 4000px-wide "avatar"). */
  readonly maxOutputDimension?: number;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () =>
      reject(new Error("Failed to load image")),
    );
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  maxOutputDimension: number,
): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  const scale = Math.min(1, maxOutputDimension / Math.max(pixelCrop.width, pixelCrop.height));
  const outputWidth = Math.round(pixelCrop.width * scale);
  const outputHeight = Math.round(pixelCrop.height * scale);

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      "image/jpeg",
      0.95,
    );
  });
}

export default function ImageCropper({
  image,
  aspectRatio,
  onCropComplete,
  onCancel,
  cropShape = "rect",
  maxOutputDimension = 1600,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onCropCompleteInternal = useCallback(
    (_: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  const handleDone = async () => {
    if (!croppedAreaPixels || isProcessing) return;
    setIsProcessing(true);
    setError(null);
    try {
      const croppedBlob = await getCroppedImg(image, croppedAreaPixels, maxOutputDimension);
      if (!croppedBlob) {
        throw new Error("Could not process the image. Please try a different photo.");
      }
      onCropComplete(croppedBlob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to crop the image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
      <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Crop className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              Crop Your Image
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-foreground/50 hover:text-foreground hover:bg-foreground/5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cropper Area */}
        <div className="relative flex-1 bg-black overflow-hidden">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            cropShape={cropShape}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteInternal}
            onZoomChange={onZoomChange}
          />
        </div>

        {/* Controls */}
        <div className="p-6 border-t border-border bg-card space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between text-xs font-medium text-foreground/50">
              <span>Zoom</span>
              <span>{zoom.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-primary bg-foreground/5 rounded-lg h-1.5 appearance-none cursor-pointer"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="px-6 py-2.5 rounded-full font-bold text-foreground/70 hover:bg-foreground/10 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDone}
              disabled={isProcessing}
              className="bg-primary text-primary-foreground px-8 py-2.5 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-primary/25 disabled:opacity-60 disabled:hover:scale-100"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {isProcessing ? "Processing…" : "Apply Crop"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
