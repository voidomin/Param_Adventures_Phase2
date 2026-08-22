"use client";

/**
 * Downscales and re-encodes an image file entirely in the browser before
 * it's ever uploaded, so large photography never leaves the device at
 * full resolution -- this is the fix for S3-hosted images being served
 * unoptimized (next.config.ts has images.unoptimized: true, and most
 * images bypass the Cloudinary-fetch gateway anyway). Doing this on the
 * client costs nothing on our own server: it runs once, at upload time
 * (a rare admin/user action), not on every page view.
 *
 * Returns the original file/blob unchanged whenever compression isn't
 * applicable or doesn't actually help:
 * - animated GIFs (canvas only captures a single frame, which would
 *   silently destroy the animation)
 * - non-image input
 * - any browser/runtime failure (corrupt file, missing canvas support,
 *   etc.) -- never block an upload over an optimization step
 * - a "compressed" result that turned out larger than the original
 */
export async function compressImageFile(
  file: File | Blob,
  options: { maxDimension?: number; quality?: number } = {}
): Promise<File | Blob> {
  // Hero and trip-detail images render full-width (sizes="100vw"); on a
  // large, high-density display the browser wants more than a modest cap
  // to still look crisp. 2560px + 90% quality keeps virtually all of the
  // original's visual detail (WebP at this quality is not distinguishable
  // from the source for photography) while still cutting file size
  // dramatically versus a full-resolution phone/camera original --
  // photography quality matters too much for this business to trade it
  // for a marginally smaller file.
  const { maxDimension = 2560, quality = 0.9 } = options;

  if (file.type === "image/gif" || !file.type.startsWith("image/")) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const toBlob = (type: string) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), type, quality));

    const webpBlob = await toBlob("image/webp");
    // A browser that doesn't support encoding WebP silently hands back a
    // PNG instead of the type we asked for -- detect that and fall back
    // to JPEG, which every canvas implementation can encode.
    const best = webpBlob?.type === "image/webp" ? webpBlob : await toBlob("image/jpeg");

    return best && best.size < file.size ? best : file;
  } catch {
    return file;
  }
}
