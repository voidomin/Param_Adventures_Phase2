import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/ist-utils", () => ({ isSlotDayToday: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    tripAssignment: { findUnique: vi.fn() },
    slot: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { POST } from "@/app/api/trek-lead/trips/[id]/trek-start/route";
import { authorizeRequest } from "@/lib/api-auth";
import { isSlotDayToday } from "@/lib/ist-utils";
import { logActivity } from "@/lib/audit-logger";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockIsSlotDayToday = vi.mocked(isSlotDayToday);
const mockLogActivity = vi.mocked(logActivity);
const mockAssignmentFindUnique = vi.mocked(prisma.tripAssignment.findUnique);
const mockSlotFindUnique = vi.mocked(prisma.slot.findUnique);
const mockSlotUpdate = vi.mocked(prisma.slot.update);

describe("POST /api/trek-lead/trips/[id]/trek-start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await POST({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 403 when not assigned", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockAssignmentFindUnique.mockResolvedValue(null);

    const response = await POST({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns 404 when trip is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockAssignmentFindUnique.mockResolvedValue({ id: "a1" } as any);
    mockSlotFindUnique.mockResolvedValue(null);

    const response = await POST({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 409 with manager-not-started message for UPCOMING", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockAssignmentFindUnique.mockResolvedValue({ id: "a1" } as any);
    mockSlotFindUnique.mockResolvedValue({ id: "slot-1", date: new Date(), status: "UPCOMING" } as any);

    const response = await POST({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(409);
  });

  it("returns 409 for other non-ACTIVE states", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockAssignmentFindUnique.mockResolvedValue({ id: "a1" } as any);
    mockSlotFindUnique.mockResolvedValue({ id: "slot-1", date: new Date(), status: "TREK_ENDED" } as any);

    const response = await POST({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(409);
  });

  it("returns 403 when date lock fails", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockAssignmentFindUnique.mockResolvedValue({ id: "a1" } as any);
    mockSlotFindUnique.mockResolvedValue({ id: "slot-1", date: new Date(), status: "ACTIVE" } as any);
    mockIsSlotDayToday.mockReturnValue(false);

    const response = await POST({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("starts trek and logs activity", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockAssignmentFindUnique.mockResolvedValue({ id: "a1" } as any);
    mockSlotFindUnique.mockResolvedValue({ id: "slot-1", date: new Date(), status: "ACTIVE" } as any);
    mockIsSlotDayToday.mockReturnValue(true);
    mockSlotUpdate.mockResolvedValue({ status: "TREK_STARTED", trekStartedAt: new Date() } as any);

    const response = await POST({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockLogActivity).toHaveBeenCalledWith("TREK_STARTED", "t1", "Slot", "slot-1");
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockAssignmentFindUnique.mockRejectedValue(new Error("db down"));

    const response = await POST({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(500);
  });
});
