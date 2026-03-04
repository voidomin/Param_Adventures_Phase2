import { prisma } from "@/lib/db";

/**
 * Log a system activity securely.
 * @param action - The action string (e.g. "ROLE_ASSIGNED", "TRIP_COMPLETED")
 * @param actorId - ID of the user performing the action (can be null for system actions)
 * @param targetType - What entity was affected (e.g. "User", "Slot", "Booking")
 * @param targetId - The ID of the affected entity
 * @param metadata - Extra JSON context
 */
export async function logActivity(
  action: string,
  actorId: string | null,
  targetType: string,
  targetId?: string | null,
  metadata?: Record<string, any>,
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        actorId,
        targetType,
        targetId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      },
    });
  } catch (error) {
    // We swallow errors here so a failed log doesn't crash the main business transaction
    console.error("[Audit Logger Error]", error);
  }
}
