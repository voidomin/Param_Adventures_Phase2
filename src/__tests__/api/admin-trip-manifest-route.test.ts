import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    booking: { findMany: vi.fn() },
  },
}));

import { GET } from "@/app/api/admin/trips/[id]/manifest/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindMany = vi.mocked(prisma.booking.findMany);

describe("GET /api/admin/trips/[id]/manifest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as any);

    const response = await GET({} as NextRequest, { params: Promise.resolve({ id: "slot-1" }) });

    expect(response.status).toBe(401);
  });

  it("returns confirmed booking manifest", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockResolvedValue([{ id: "b1" }] as any);

    const response = await GET({} as NextRequest, { params: Promise.resolve({ id: "slot-1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.manifest).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slotId: "slot-1", bookingStatus: "CONFIRMED" },
      }),
    );
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockRejectedValue(new Error("db down"));

    const response = await GET({} as NextRequest, { params: Promise.resolve({ id: "slot-1" }) });

    expect(response.status).toBe(500);
  });
});
