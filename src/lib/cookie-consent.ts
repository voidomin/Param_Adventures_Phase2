/**
 * Single source of truth for the cookie-consent cookie name/values, shared
 * between the client-side banner (which sets it) and any server component
 * that needs to gate analytics scripts on it (which reads it via
 * next/headers' cookies()).
 */
export const COOKIE_CONSENT_COOKIE = "cookie_consent";
export const COOKIE_CONSENT_ACCEPTED = "accepted";
export const COOKIE_CONSENT_REJECTED = "rejected";
export const COOKIE_CONSENT_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
