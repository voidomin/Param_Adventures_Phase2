import { describe, it, expect, vi, beforeEach } from "vitest";
import { logActivity } from "@/lib/audit-logger";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

const mockAuditLogCreate = vi.mocked(prisma.auditLog.create);

describe("logActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an audit log entry with provided data", async () => {
    mockAuditLogCreate.mockResolvedValue({} as any);

    await logActivity("BOOKING_CREATED", "user-123", "Booking", "booking-456", { extra: "data" });

    expect(mockAuditLogCreate).toHaveBeenCalledTimes(1);
    expect(mockAuditLogCreate).toHaveBeenCalledWith({
      data: {
        action: "BOOKING_CREATED",
        actorId: "user-123",
        targetType: "Booking",
        targetId: "booking-456",
        metadata: { extra: "data" },
      },
    });
  });

  it("handles null actorId and targetId", async () => {
    mockAuditLogCreate.mockResolvedValue({} as any);

    await logActivity("SYSTEM_START", null, "System");

    expect(mockAuditLogCreate).toHaveBeenCalledWith({
      data: {
        action: "SYSTEM_START",
        actorId: null,
        targetType: "System",
        targetId: undefined, // omitted from passing explicitly, becomes undefined
        metadata: null,
      },
    });
  });

  it("swallows errors to prevent crashing the main transaction", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockAuditLogCreate.mockRejectedValue(new Error("Database disconnected"));

    // Should not throw
    await expect(logActivity("ERROR", "1", "Test")).resolves.not.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalledWith("[Audit Logger Error]", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  describe("PII Scrubbing", () => {
    it("scrubs sensitive keys from metadata", async () => {
      mockAuditLogCreate.mockResolvedValue({} as any);

      const sensitiveMetadata = {
        ip: "127.0.0.1",
        email: "leak@example.com",
        phone: "1234567890",
        nested: {
          adminEmail: "admin@corp.com",
          publicInfo: "all good"
        }
      };

      await logActivity("SENSITIVE_ACTION", "user-1", "SYSTEM", null, sensitiveMetadata);

      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: {
            ip: "127.0.0.1",
            email: "[REDACTED]",
            phone: "[REDACTED]",
            nested: {
              adminEmail: "[REDACTED]",
              publicInfo: "all good"
            }
          }
        })
      });
    });
  });
});
