import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    slot: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/admin/trips/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindMany = vi.mocked(prisma.slot.findMany);

describe("GET /api/admin/trips", () => {
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

  it("returns transformed trips with confirmed participant totals", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockResolvedValue([
      {
        id: "slot-1",
        bookings: [
          { participantCount: 2 },
          { participantCount: 3 },
        ],
        experience: { title: "Everest", location: "Nepal" },
        manager: { id: "m1", name: "M", email: "m@example.com" },
        assignments: [],
      },
    ] as any);

    const response = await GET({} as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.trips).toHaveLength(1);
    expect(data.trips[0].confirmedParticipants).toBe(5);
    expect(data.trips[0].bookings).toBeUndefined();
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { date: { gte: expect.any(Date) } },
      }),
    );
  });

  it("returns 500 on query failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockRejectedValue(new Error("db down"));

    const response = await GET({} as NextRequest);

    expect(response.status).toBe(500);
  });
});
