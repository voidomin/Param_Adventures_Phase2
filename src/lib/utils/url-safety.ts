/**
 * URL safety utility functions.
 * Centralizes hostname validations and avoids insecure substring/suffix checking patterns
 * which trigger CodeQL "Incomplete URL substring sanitization" alerts.
 */

/**
 * Safely parses a URL and checks if its hostname belongs to Cloudinary (*.cloudinary.com or cloudinary.com).
 */
export function isCloudinaryUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname.toLowerCase();
    const parts = host.split(".");
    const len = parts.length;
    if (len < 2) return false;
    return parts[len - 2] === "cloudinary" && parts[len - 1] === "com";
  } catch {
    return false;
  }
}

/**
 * Safely parses a URL and checks if its hostname is exactly res.cloudinary.com or a subdomain of it.
 */
export function isResCloudinaryUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname.toLowerCase();
    const parts = host.split(".");
    const len = parts.length;
    if (len < 3) return false;
    return (
      parts[len - 3] === "res" &&
      parts[len - 2] === "cloudinary" &&
      parts[len - 1] === "com"
    );
  } catch {
    return false;
  }
}

/**
 * Safely parses a URL and checks if its hostname belongs to AWS Amazon Web Services (*.amazonaws.com or amazonaws.com).
 */
export function isAwsUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname.toLowerCase();
    const parts = host.split(".");
    const len = parts.length;
    if (len < 2) return false;
    return parts[len - 2] === "amazonaws" && parts[len - 1] === "com";
  } catch {
    return false;
  }
}

/**
 * Whether `url` points at one of the platform's own known media hosts
 * (Cloudinary or S3/amazonaws.com). Used to keep media-fetching/registration
 * endpoints from accepting or fetching arbitrary attacker-supplied URLs.
 */
export function isAllowedMediaHost(url: string): boolean {
  return isResCloudinaryUrl(url) || isAwsUrl(url);
}

/**
 * Safely parses a URL and checks if it belongs to S3 storage (AWS amazonaws.com, local s3 subdomains, or localhost).
 */
export function isS3Url(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") return true;

    const parts = host.split(".");
    const len = parts.length;
    if (len < 2) return false;

    const isAws = parts[len - 2] === "amazonaws" && parts[len - 1] === "com";
    const hasS3Label = parts.includes("s3");
    return isAws && hasS3Label;
  } catch {
    return false;
  }
}
