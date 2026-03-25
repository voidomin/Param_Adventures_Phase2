import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/ist-utils", () => ({
  isSlotDayToday: vi.fn(),
  todayInIST: vi.fn(),
  dateInIST: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    tripAssignment: { findUnique: vi.fn() },
    slot: { findUnique: vi.fn() },
  },
}));

import { GET } from "@/app/api/trek-lead/trips/[id]/route";
import { authorizeRequest } from "@/lib/api-auth";
import { isSlotDayToday, todayInIST, dateInIST } from "@/lib/ist-utils";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockIsSlotDayToday = vi.mocked(isSlotDayToday);
const mockTodayInIST = vi.mocked(todayInIST);
const mockDateInIST = vi.mocked(dateInIST);
const mockAssignmentFindUnique = vi.mocked(prisma.tripAssignment.findUnique);
const mockSlotFindUnique = vi.mocked(prisma.slot.findUnique);

describe("GET /api/trek-lead/trips/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 403 when not assigned", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockAssignmentFindUnique.mockResolvedValue(null);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns 404 when slot missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockAssignmentFindUnique.mockResolvedValue({ id: "a1" } as any);
    mockSlotFindUnique.mockResolvedValue(null);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns slot details with D-Day metadata", async () => {
    const date = new Date("2026-03-20T00:00:00.000Z");
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockAssignmentFindUnique.mockResolvedValue({ id: "a1" } as any);
    mockSlotFindUnique.mockResolvedValue({ id: "slot-1", date } as any);
    mockIsSlotDayToday.mockReturnValue(true);
    mockDateInIST.mockReturnValue("20-03-2026" as any);
    mockTodayInIST.mockReturnValue("20-03-2026" as any);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.slot.id).toBe("slot-1");
    expect(data.isDDay).toBe(true);
    expect(data.slotDateIST).toBe("20-03-2026");
    expect(data.currentDateIST).toBe("20-03-2026");
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockAssignmentFindUnique.mockRejectedValue(new Error("db down"));

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(500);
  });
});
