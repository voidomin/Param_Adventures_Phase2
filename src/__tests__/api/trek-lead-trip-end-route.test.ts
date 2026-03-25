import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    tripAssignment: { findUnique: vi.fn() },
    slot: { findUnique: vi.fn(), update: vi.fn() },
    tripLog: { upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { POST } from "@/app/api/trek-lead/trips/[id]/trek-end/route";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockLogActivity = vi.mocked(logActivity);
const mockAssignmentFindUnique = vi.mocked(prisma.tripAssignment.findUnique);
const mockSlotFindUnique = vi.mocked(prisma.slot.findUnique);
const mockSlotUpdate = vi.mocked(prisma.slot.update);
const mockTripLogUpsert = vi.mocked(prisma.tripLog.upsert);
const mockTransaction = vi.mocked(prisma.$transaction);

const createRequest = (body?: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body ?? {}) }) as unknown as NextRequest;

describe("POST /api/trek-lead/trips/[id]/trek-end", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSlotUpdate.mockResolvedValue({ status: "TREK_ENDED", trekEndedAt: new Date() } as any);
    mockTripLogUpsert.mockResolvedValue({} as any);
    mockTransaction.mockImplementation(async (ops: any) => Promise.all(ops));
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await POST(createRequest({}), {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid payload", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);

    const response = await POST(createRequest({ trekLeadNote: "a".repeat(2001) }), {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 403 when not assigned", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockAssignmentFindUnique.mockResolvedValue(null);

    const response = await POST(createRequest({}), {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns 404 when trip missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockAssignmentFindUnique.mockResolvedValue({ id: "a1" } as any);
    mockSlotFindUnique.mockResolvedValue(null);

    const response = await POST(createRequest({}), {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 409 when status is not TREK_STARTED", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockAssignmentFindUnique.mockResolvedValue({ id: "a1" } as any);
    mockSlotFindUnique.mockResolvedValue({ status: "ACTIVE" } as any);

    const response = await POST(createRequest({}), {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(409);
  });

  it("ends trek with trimmed note and logs activity", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockAssignmentFindUnique.mockResolvedValue({ id: "a1" } as any);
    mockSlotFindUnique.mockResolvedValue({ status: "TREK_STARTED" } as any);

    const response = await POST(createRequest({ trekLeadNote: "  done  " }), {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockLogActivity).toHaveBeenCalledWith("TREK_ENDED", "t1", "Slot", "slot-1", {
      trekLeadNote: "done",
    });
  });

  it("uses default note when note is omitted", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockAssignmentFindUnique.mockResolvedValue({ id: "a1" } as any);
    mockSlotFindUnique.mockResolvedValue({ status: "TREK_STARTED" } as any);

    const response = await POST(createRequest({}), {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockLogActivity).toHaveBeenCalledWith("TREK_ENDED", "t1", "Slot", "slot-1", {
      trekLeadNote: "No notes provided",
    });
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockAssignmentFindUnique.mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest({}), {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(500);
  });
});
