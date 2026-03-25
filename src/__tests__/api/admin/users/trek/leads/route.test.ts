import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: { user: { findMany: vi.fn() } },
}));

import { GET } from "@/app/api/admin/users/trek-leads/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindMany = vi.mocked(prisma.user.findMany);

describe("GET /api/admin/users/trek-leads", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as any);

    const response = await GET({} as NextRequest);

    expect(response.status).toBe(401);
  });

  it("returns active trek leads", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockResolvedValue([{ id: "t1", name: "Lead" }] as any);

    const response = await GET({} as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.trekLeads).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { status: "ACTIVE", role: { name: "TREK_LEAD" } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  });

  it("returns 500 on query failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockRejectedValue(new Error("db down"));

    const response = await GET({} as NextRequest);

    expect(response.status).toBe(500);
  });
});
