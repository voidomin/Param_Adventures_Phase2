import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    slot: { findMany: vi.fn() },
  },
}));

import { GET } from "@/app/api/trek-lead/assignments/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockSlotFindMany = vi.mocked(prisma.slot.findMany);

describe("GET /api/trek-lead/assignments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await GET({} as NextRequest);

    expect(response.status).toBe(401);
  });

  it("returns 403 when role record is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockUserFindUnique.mockResolvedValue(null);

    const response = await GET({} as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Unauthorized access. Trek Lead role required.");
  });

  it("returns 403 for disallowed role", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockUserFindUnique.mockResolvedValue({ role: { name: "USER" } } as any);

    const response = await GET({} as NextRequest);

    expect(response.status).toBe(403);
  });

  it("returns assignments for TREK_LEAD", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockUserFindUnique.mockResolvedValue({ role: { name: "TREK_LEAD" } } as any);
    mockSlotFindMany.mockResolvedValue([{ id: "slot-1" }] as any);

    const response = await GET({} as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.assignments).toHaveLength(1);
    expect(mockSlotFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignments: { some: { trekLeadId: "t1" } },
        }),
        orderBy: { date: "asc" },
      }),
    );
  });

  it("allows ADMIN role", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockUserFindUnique.mockResolvedValue({ role: { name: "ADMIN" } } as any);
    mockSlotFindMany.mockResolvedValue([] as any);

    const response = await GET({} as NextRequest);

    expect(response.status).toBe(200);
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockUserFindUnique.mockRejectedValue(new Error("db down"));

    const response = await GET({} as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch assignments.");
  });
});
