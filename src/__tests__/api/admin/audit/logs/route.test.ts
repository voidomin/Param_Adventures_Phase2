import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/admin/audit-logs/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindMany = vi.mocked(prisma.auditLog.findMany);
const mockCount = vi.mocked(prisma.auditLog.count);

describe("GET /api/admin/audit-logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await GET(new NextRequest("http://localhost/api/admin/audit-logs"));

    expect(response.status).toBe(401);
  });

  it("returns 403 for non-super-admin", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "ADMIN",
    } as any);

    const response = await GET(new NextRequest("http://localhost/api/admin/audit-logs"));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("SUPER_ADMIN only");
  });

  it("returns paginated logs with filters", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "SUPER_ADMIN",
    } as any);

    mockFindMany.mockResolvedValue([{ id: "l1" }] as any);
    mockCount.mockResolvedValue(9);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/audit-logs?page=2&limit=4&action=ROLE_ASSIGNED&search=booking",
      ),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.logs).toHaveLength(1);
    expect(data.total).toBe(9);
    expect(data.totalPages).toBe(3);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          action: "ROLE_ASSIGNED",
          OR: expect.any(Array),
        }),
        orderBy: { timestamp: "desc" },
        skip: 4,
        take: 4,
      }),
    );
  });

  it("returns 500 on db failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "SUPER_ADMIN",
    } as any);
    mockFindMany.mockRejectedValue(new Error("db down"));

    const response = await GET(new NextRequest("http://localhost/api/admin/audit-logs"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch audit logs.");
  });
});
