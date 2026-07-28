import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    auditLog: {
      deleteMany: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/admin/audit-logs/purge/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockDeleteMany = vi.mocked(prisma.auditLog.deleteMany);

const createRequest = (headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api/admin/audit-logs/purge", {
    method: "POST",
    headers,
  });

describe("POST /api/admin/audit-logs/purge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    delete process.env.AUDIT_LOG_RETENTION_DAYS;
  });

  it("allows a valid admin session (system:config permission)", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin1" } as any);
    mockDeleteMany.mockResolvedValue({ count: 3 });

    const response = await POST(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(3);
  });

  it("allows a valid cron secret without an admin session", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);
    mockDeleteMany.mockResolvedValue({ count: 0 });

    const response = await POST(createRequest({ "x-cron-secret": "test-cron-secret" }));
    expect(response.status).toBe(200);
  });

  it("rejects an invalid cron secret with no admin session", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await POST(createRequest({ "x-cron-secret": "wrong-secret" }));
    expect(response.status).toBe(401);
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it("purges rows older than the default 365-day retention window", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin1" } as any);
    mockDeleteMany.mockResolvedValue({ count: 5 });

    await POST(createRequest());

    const call = mockDeleteMany.mock.calls[0][0] as any;
    const cutoff = call.where.timestamp.lt as Date;
    const daysAgo = (Date.now() - cutoff.getTime()) / (24 * 60 * 60 * 1000);
    expect(daysAgo).toBeCloseTo(365, 0);
  });

  it("honors AUDIT_LOG_RETENTION_DAYS when set", async () => {
    vi.stubEnv("AUDIT_LOG_RETENTION_DAYS", "30");
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin1" } as any);
    mockDeleteMany.mockResolvedValue({ count: 1 });

    await POST(createRequest());

    const call = mockDeleteMany.mock.calls[0][0] as any;
    const cutoff = call.where.timestamp.lt as Date;
    const daysAgo = (Date.now() - cutoff.getTime()) / (24 * 60 * 60 * 1000);
    expect(daysAgo).toBeCloseTo(30, 0);
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin1" } as any);
    mockDeleteMany.mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest());
    expect(response.status).toBe(500);
  });
});
