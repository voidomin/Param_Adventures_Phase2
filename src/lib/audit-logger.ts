import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * Log a system activity securely.
 * Supports optional Prisma transactions to ensure atomicity.
 * @param action - The action string (e.g. "ROLE_ASSIGNED", "UPDATE_SYSTEM_SETTING")
 * @param actorId - ID of the user performing the action
 * @param targetType - What entity was affected (e.g. "USER", "SYSTEM", "BOOKING")
 * @param targetId - The ID of the affected entity (e.g. Setting Key or User ID)
 * @param metadata - Extra context (IP, User Agent, etc.)
 * @param tx - Optional Prisma transaction client
 */
/**
 * SENSITIVE_KEYS: Keys that should be redacted from audit logs to prevent PII leaks.
 */
const SENSITIVE_KEYS = new Set([
  "email",
  "emailAddress",
  "phone",
  "phoneNumber",
  "password",
  "token",
  "secret",
  "name",
  "firstName",
  "lastName",
  "adminEmail",
  "razorpay_key_secret",
  "razorpay_webhook_secret",
  "smtp_pass",
]);

/**
 * Recursively scrubs PII from an object.
 */
function scrubPII(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(scrubPII);

  const entries = Object.entries(obj as Record<string, unknown>);
  const scrubbed: Record<string, unknown> = {};

  for (const [key, value] of entries) {
    if (SENSITIVE_KEYS.has(key)) {
      scrubbed[key] = "[REDACTED]";
    } else if (typeof value === "object") {
      scrubbed[key] = scrubPII(value);
    } else {
      scrubbed[key] = value;
    }
  }
  return scrubbed;
}

/**
 * Log a system activity securely.
 * Supports optional Prisma transactions to ensure atomicity.
 * 
 * v1.0.2 Upgrade: Automatically scrubs PII from metadata.
 */
export async function logActivity(
  action: string,
  actorId: string | null,
  targetType: string,
  targetId?: string | null,
  metadata?: Record<string, unknown>,
  tx?: Prisma.TransactionClient,
) {
  const client = tx || prisma;
  try {
    // Scrub metadata to prevent PII leakage into logs
    const sanitizedMetadata = metadata ? scrubPII(metadata) : null;

    await client.auditLog.create({
      data: {
        action,
        actorId,
        targetType,
        targetId,
        metadata: sanitizedMetadata as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (tx) {
      // If we are in a transaction, we SHOULD NOT swallow the error
      // as it might compromise the atomicity of the entire operation.
      throw error;
    }
    // For non-critical logs elsewhere, we just log to console.
    console.error("[Audit Logger Error]", error);
  }
}

/**
 * Legacy alias for logActivity if needed, but preferred to use logActivity.
 */
export const logAudit = logActivity;
