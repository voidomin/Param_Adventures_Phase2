import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: { user: { findMany: vi.fn() } },
}));

import { GET } from "@/app/api/admin/users/managers/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindMany = vi.mocked(prisma.user.findMany);

describe("GET /api/admin/users/managers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as any);

    const response = await GET({} as NextRequest);

    expect(response.status).toBe(401);
  });

  it("returns active trip managers", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockResolvedValue([{ id: "m1", name: "Manager" }] as any);

    const response = await GET({} as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.managers).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { status: "ACTIVE", role: { name: "TRIP_MANAGER" } },
      select: {
        id: true,
        name: true,
        email: true,
        role: { select: { name: true } },
      },
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
