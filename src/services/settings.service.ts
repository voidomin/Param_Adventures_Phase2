import { prisma } from "@/lib/db";

export const SENSITIVE_KEYS = new Set([
  "jwt_secret",
  "razorpay_key_secret",
  "razorpay_webhook_secret",
  "smtp_pass",
  "zoho_api_key",
  "resend_api_key",
  "aws_secret_access_key"
]);

export const PLATFORM_KEYS = new Set([
  "razorpay_mode", 
  "razorpay_key_id", 
  "razorpay_key_secret", 
  "razorpay_webhook_secret",
  "taxConfig",
  "companyName",
  "gstNumber",
  "panNumber",
  "stateCode",
  "companyAddress",
  "jwt_secret",
  "session_lifetime_hrs",
  "google_analytics_id",
  "google_analytics_enabled",
  "sentry_dsn",
  "sentry_enabled",
  "meta_pixel_id",
  "meta_pixel_enabled",
  "microsoft_clarity_id",
  "microsoft_clarity_enabled",
  "email_provider",
  "smtp_host",
  "smtp_port",
  "smtp_user",
  "smtp_pass",
  "smtp_secure",
  "smtp_from",
  "zoho_api_key",
  "resend_api_key"
]);

const MASK_VALUE = "[UNREVEALED]";

export const SettingsService = {
  /**
   * Fetches merged settings (Platform + Site) with sensitive data masked.
   */
  async getMergedSettings() {
    // 1. Fetch relevant platform settings
    const platformSettings = await prisma.platformSetting.findMany({
      where: { key: { in: Array.from(PLATFORM_KEYS) } }
    });

    const relevantSiteSettings = await prisma.siteSetting.findMany({
      where: { key: { in: Array.from(PLATFORM_KEYS) } }
    });

    const allSiteSettings = await prisma.siteSetting.findMany();

    const merged: Record<string, string> = {};
    
    // Fallback logic
    allSiteSettings.forEach(s => merged[s.key] = s.value);
    relevantSiteSettings.forEach(s => merged[s.key] = s.value);
    platformSettings.forEach(s => merged[s.key] = s.value);

    // Security Masking
    Object.keys(merged).forEach(k => {
      if (SENSITIVE_KEYS.has(k) && merged[k]) {
        merged[k] = MASK_VALUE;
      }
    });

    return merged;
  },

  /**
   * Bulk updates settings. Handles platform vs site redirection.
   * Transactional and security-aware (skips updating masked placeholders).
   */
  async updateSettings(settings: Record<string, unknown>) {
    return prisma.$transaction(
      Object.entries(settings)
        .filter(([key, value]) => {
          // Security check: Don't overwrite real secrets with the mask placeholder
          if (SENSITIVE_KEYS.has(key) && value === MASK_VALUE) {
            return false;
          }
          return true;
        })
        .map(([key, value]) => {
          if (PLATFORM_KEYS.has(key)) {
            return prisma.platformSetting.upsert({
              where: { key },
              update: { value: String(value) },
              create: { key, value: String(value) }
            });
          }
          return prisma.siteSetting.upsert({
            where: { key },
            update: { value: String(value) },
            create: { key, value: String(value) }
          });
        })
    );
  },

  /**
   * Deletes a site setting.
   */
  async deleteSetting(key: string) {
    return prisma.siteSetting.deleteMany({ where: { key } });
  }
};
