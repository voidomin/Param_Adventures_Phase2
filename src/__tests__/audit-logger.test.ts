import { describe, it, expect, vi, beforeEach } from "vitest";
import { logActivity } from "../lib/audit-logger";
import { prisma } from "../lib/db";

vi.mock("../lib/db", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("logActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully creates an audit log with metadata", async () => {
    const metadata = { foo: "bar" };
    await logActivity("TEST_ACTION", "user1", "User", "user2", metadata);

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: "TEST_ACTION",
        actorId: "user1",
        targetType: "User",
        targetId: "user2",
        metadata: metadata,
      },
    });
  });

  it("handles empty metadata and targetId", async () => {
    await logActivity("SYSTEM_START", null, "System");

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: "SYSTEM_START",
        actorId: null,
        targetType: "System",
        targetId: undefined,
        metadata: null,
      },
    });
  });

  it("swallows errors and logs to console", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.auditLog.create).mockRejectedValue(new Error("DB error"));

    await logActivity("FAIL_ACTION", null, "Test");

    expect(consoleSpy).toHaveBeenCalledWith("[Audit Logger Error]", expect.any(Error));
    consoleSpy.mockRestore();
  });
});
