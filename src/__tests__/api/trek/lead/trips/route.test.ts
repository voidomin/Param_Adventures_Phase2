import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    tripAssignment: { findMany: vi.fn() },
  },
}));

import { GET } from "@/app/api/trek-lead/trips/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindMany = vi.mocked(prisma.tripAssignment.findMany);

describe("GET /api/trek-lead/trips", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as any);

    const response = await GET({} as NextRequest);

    expect(response.status).toBe(401);
  });

  it("maps assignments to slot trips", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockFindMany.mockResolvedValue([{ slot: { id: "s1" } }, { slot: { id: "s2" } }] as any);

    const response = await GET({} as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.trips.map((t: any) => t.id)).toEqual(["s1", "s2"]);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { trekLeadId: "t1" } }),
    );
  });

  it("returns 500 on query failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockFindMany.mockRejectedValue(new Error("db down"));

    const response = await GET({} as NextRequest);

    expect(response.status).toBe(500);
  });
});
