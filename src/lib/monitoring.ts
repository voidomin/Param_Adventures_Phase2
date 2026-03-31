import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/db";

/**
 * Checks the database to see if Sentry error monitoring is globally enabled.
 * This allows for a "Runtime Kill Switch" without redeploying code.
 */
export async function isSentryEnabled(): Promise<boolean> {
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: "sentry_enabled" },
    });
    
    // Diagnostic Log: Helps identify if the key is missing or has an unexpected value
    if (!setting) {
      console.info("[MONITORING] Key 'sentry_enabled' not found in DB. Defaulting to ENABLED.");
      return true;
    }

    const isEnabled = setting.value.toLowerCase().trim() === "true";
    console.info(`[MONITORING] Database state: sentry_enabled = ${setting.value} (Result: ${isEnabled ? "ENABLED" : "DISABLED"})`);
    
    return isEnabled;
  } catch (error) {
    // If DB is down, default to ON to catch the DB error itself!
    console.error("Failed to fetch Sentry status from DB:", error);
    return true;
  }
}

/**
 * Standardized error logger for Param Adventures.
 * Automatically respects the database kill switch.
 */
export async function logError(error: Error | string, context: Record<string, any> = {}) {
  const enabled = await isSentryEnabled();
  
  if (!enabled) {
    console.warn("[MONITORING] Sentry is disabled. Error skipped:", error);
    return;
  }

  if (typeof error === "string") {
    Sentry.captureMessage(error, { extra: context });
  } else {
    Sentry.captureException(error, { extra: context });
  }
}
