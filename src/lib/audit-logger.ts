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
    await client.auditLog.create({
      data: {
        action,
        actorId,
        targetType,
        targetId,
        // @ts-expect-error Prisma strictly expects InputJsonValue which clashes with Record<string,any>
        metadata: metadata ? (structuredClone(metadata) as Prisma.InputJsonValue) : null,
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
