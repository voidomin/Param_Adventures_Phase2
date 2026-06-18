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
      const cdnHost = new URL(cdnUrl).hostname.toLowerCase();
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
    return getS3Url(processedPath, settings.s3Bucket, settings.s3Region, settings.cdnUrl);
  }

  return processedPath.startsWith('/') ? processedPath : `/${processedPath}`;
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

  const transformPath = transforms.length > 0 ? transforms.join(',') + '/' : '';
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  return `${baseUrl}/${transformPath}${cleanPath}`;
}

function getS3Url(path: string, bucket: string, region: string = 'ap-south-1', cdnUrl?: string): string {
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  if (cdnUrl) {
    const base = cdnUrl.endsWith('/') ? cdnUrl.slice(0, -1) : cdnUrl;
    return `${base}/${cleanPath}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${cleanPath}`;
}
