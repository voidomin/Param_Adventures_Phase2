import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    booking: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/bookings/my/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindMany = vi.mocked(prisma.booking.findMany);

describe("GET /api/bookings/my", () => {
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

  it("groups bookings by status buckets", async () => {
    const now = Date.now();
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindMany.mockResolvedValue([
      { id: "u", bookingStatus: "CONFIRMED", slot: { date: new Date(now + 3600000) } },
      { id: "p", bookingStatus: "CONFIRMED", slot: { date: new Date(now - 3600000) } },
      { id: "r", bookingStatus: "REQUESTED", slot: null },
      { id: "c", bookingStatus: "CANCELLED", slot: null },
      { id: "x", bookingStatus: "CONFIRMED", slot: null },
    ] as any);

    const response = await GET({} as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.upcoming.map((b: any) => b.id)).toEqual(["u"]);
    expect(data.past.map((b: any) => b.id)).toEqual(["p"]);
    expect(data.pending.map((b: any) => b.id)).toEqual(["r"]);
    expect(data.cancelled.map((b: any) => b.id)).toEqual(["c"]);
  });

  it("returns 500 on unexpected failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockFindMany.mockRejectedValue(new Error("db down"));

    const response = await GET({} as NextRequest);

    expect(response.status).toBe(500);
  });
});
