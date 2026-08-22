import { isResCloudinaryUrl, isAwsUrl } from "@/lib/utils/url-safety";

/**
 * Media Gateway Utility
 * 
 * Provides a provider-agnostic way to retrieve and optimize trek media.
 * Supports Cloudinary today and AWS S3 in the future.
 */

export interface MediaOptions {
  width?: number;
  height?: number;
  quality?: number; // 1-100
  format?: 'auto' | 'webp' | 'avif';
  crop?: 'fill' | 'scale' | 'thumb';
}

type MediaProvider = 'CLOUDINARY' | 'AWS_S3' | (string & {});

function parseCloudinaryPath(path: string): string {
  const uploadIndex = path.indexOf("/upload/");
  if (uploadIndex !== -1) {
    let tempPath = path.substring(uploadIndex + "/upload/".length);
    // Strip Cloudinary version prefix if present (e.g. /v1234567/)
    if (/^v\d+\//.test(tempPath)) {
      tempPath = tempPath.replace(/^v\d+\//, "");
    }
    return tempPath;
  }
  return path;
}

function parseS3Path(path: string): string {
  try {
    const urlObj = new URL(path);
    return urlObj.pathname.substring(1);
  } catch {
    return path;
  }
}

function resolveHttpSource(
  path: string,
  provider: MediaProvider,
  cdnUrl?: string
): { detectedProvider: MediaProvider; processedPath: string; shouldReturnRaw: boolean } {
  let isCdnUrl = false;
  if (cdnUrl) {
    try {
      const normalize = (value: string) => (value.includes("://") ? value : `https://${value}`);
      const cdnHost = new URL(normalize(cdnUrl)).hostname.toLowerCase();
      const pathHost = new URL(path).hostname.toLowerCase();
      isCdnUrl = pathHost === cdnHost;
    } catch {}
  }

  if (isResCloudinaryUrl(path)) {
    return {
      detectedProvider: "CLOUDINARY",
      processedPath: parseCloudinaryPath(path),
      shouldReturnRaw: false,
    };
  }

  if (isAwsUrl(path) || isCdnUrl) {
    return {
      detectedProvider: "AWS_S3",
      processedPath: parseS3Path(path),
      shouldReturnRaw: false,
    };
  }

  return {
    detectedProvider: provider,
    processedPath: path,
    shouldReturnRaw: true,
  };
}

export function getMediaUrl(
  path: string, 
  provider: MediaProvider,
  settings: {
    cloudinaryCloudName?: string;
    s3Bucket?: string;
    s3Region?: string;
    globalQuality?: number;
    highFidelity?: boolean;
    cdnUrl?: string;
  },
  options: MediaOptions = {}
): string {
  if (!path) return '';

  let processedPath = path;
  let detectedProvider = provider;

  if (path.startsWith('http')) {
    const resolved = resolveHttpSource(path, provider, settings.cdnUrl);
    if (resolved.shouldReturnRaw) {
      return path;
    }
    detectedProvider = resolved.detectedProvider;
    processedPath = resolved.processedPath;
  }

  const quality = options.quality ?? settings.globalQuality ?? 95;
  const isHighFid = settings.highFidelity ?? true;

  if (detectedProvider === 'CLOUDINARY' && settings.cloudinaryCloudName) {
    return getCloudinaryUrl(processedPath, settings.cloudinaryCloudName, quality, isHighFid, options);
  }

  if ((detectedProvider === 'AWS_S3' || detectedProvider === 'S3') && settings.s3Bucket) {
    const rawUrl = getS3Url(processedPath, settings.s3Bucket, settings.s3Region, settings.cdnUrl);

    // next.config.ts sets images.unoptimized: true (deliberately, so Next
    // doesn't re-process already-transformed Cloudinary URLs) -- but that
    // leaves S3-hosted originals with zero optimization anywhere. Rather
    // than paying for on-demand server-side resizing on our own Render
    // instance, reuse the Cloudinary account we already have via its
    // "fetch" delivery type: Cloudinary fetches the S3 original once,
    // transforms and caches it on ITS CDN, and every later request for the
    // same size/format is served straight from that cache -- no Render CPU
    // involved, ever. Only image files: this same gateway also serves PDFs
    // (invoices, itineraries) and videos, neither of which should be
    // rewritten into an image transform URL.
    const isImage = /\.(jpe?g|png|webp|avif|gif|bmp|tiff?)$/i.test(rawUrl);
    if (settings.cloudinaryCloudName && isImage) {
      return getCloudinaryFetchUrl(rawUrl, settings.cloudinaryCloudName, quality, isHighFid, options);
    }
    return rawUrl;
  }

  return processedPath.startsWith('/') ? processedPath : `/${processedPath}`;
}

function buildCloudinaryTransforms(
  quality: number,
  isHighFid: boolean,
  options: MediaOptions
): string[] {
  const transforms: string[] = [];

  if (isHighFid && quality >= 95) {
    transforms.push('q_auto:best');
  } else {
    transforms.push(`q_${quality}`);
  }

  transforms.push('f_auto');
  if (options.width) transforms.push(`w_${options.width}`);
  if (options.height) transforms.push(`h_${options.height}`);
  if (options.crop) transforms.push(`c_${options.crop}`);

  return transforms;
}

function getCloudinaryUrl(
  path: string,
  cloudName: string,
  quality: number,
  isHighFid: boolean,
  options: MediaOptions
): string {
  const isVideo = /\.(mp4|webm|ogv|mov)$/i.test(path);
  const resourceType = isVideo ? 'video' : 'image';
  const baseUrl = `https://res.cloudinary.com/${cloudName}/${resourceType}/upload`;
  const transforms = buildCloudinaryTransforms(quality, isHighFid, options);

  const transformPath = transforms.length > 0 ? transforms.join(',') + '/' : '';
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;

  return `${baseUrl}/${transformPath}${cleanPath}`;
}

/**
 * Wraps an already-public, fully-qualified image URL (e.g. an S3 object
 * URL) in Cloudinary's "fetch" delivery type, so Cloudinary -- not our own
 * server -- does the actual resize/format conversion and CDN caching.
 * Requires "fetch" to be enabled for the Cloudinary account (on by
 * default; check Settings -> Security -> Allowed fetch domains if it
 * 401s, and allowlist the S3/CDN host there).
 */
function getCloudinaryFetchUrl(
  remoteUrl: string,
  cloudName: string,
  quality: number,
  isHighFid: boolean,
  options: MediaOptions
): string {
  const transforms = buildCloudinaryTransforms(quality, isHighFid, options);
  const transformPath = transforms.length > 0 ? transforms.join(',') + '/' : '';
  return `https://res.cloudinary.com/${cloudName}/image/fetch/${transformPath}${encodeURIComponent(remoteUrl)}`;
}

function getS3Url(path: string, bucket: string, region: string = 'ap-south-1', cdnUrl?: string): string {
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  if (cdnUrl) {
    const base = cdnUrl.endsWith('/') ? cdnUrl.slice(0, -1) : cdnUrl;
    return `${base}/${cleanPath}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${cleanPath}`;
}
