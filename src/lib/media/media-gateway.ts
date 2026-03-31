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

export function getMediaUrl(
  path: string, 
  provider: MediaProvider,
  settings: {
    cloudinaryCloudName?: string;
    s3Bucket?: string;
    s3Region?: string;
    globalQuality?: number;
    highFidelity?: boolean;
  },
  options: MediaOptions = {}
): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const quality = options.quality ?? settings.globalQuality ?? 95;
  const isHighFid = settings.highFidelity ?? true;

  if (provider === 'CLOUDINARY' && settings.cloudinaryCloudName) {
    return getCloudinaryUrl(path, settings.cloudinaryCloudName, quality, isHighFid, options);
  }

  if (provider === 'AWS_S3' && settings.s3Bucket) {
    return getS3Url(path, settings.s3Bucket, settings.s3Region);
  }

  return path.startsWith('/') ? path : `/${path}`;
}

function getCloudinaryUrl(
  path: string,
  cloudName: string,
  quality: number,
  isHighFid: boolean,
  options: MediaOptions
): string {
  const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload`;
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

function getS3Url(path: string, bucket: string, region?: string): string {
  const s3Region = region || 'ap-south-1';
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `https://${bucket}.s3.${s3Region}.amazonaws.com/${cleanPath}`;
}
