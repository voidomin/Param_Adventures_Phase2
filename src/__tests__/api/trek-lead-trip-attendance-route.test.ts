import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/ist-utils", () => ({ isSlotDayToday: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    tripAssignment: { findUnique: vi.fn() },
    slot: { findUnique: vi.fn() },
    tripLog: { upsert: vi.fn() },
    bookingParticipant: { update: vi.fn() },
  },
}));

import { POST } from "@/app/api/trek-lead/trips/[id]/attendance/route";
import { authorizeRequest } from "@/lib/api-auth";
import { isSlotDayToday } from "@/lib/ist-utils";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockIsSlotDayToday = vi.mocked(isSlotDayToday);
const mockAssignmentFindUnique = vi.mocked(prisma.tripAssignment.findUnique);
const mockSlotFindUnique = vi.mocked(prisma.slot.findUnique);
const mockTripLogUpsert = vi.mocked(prisma.tripLog.upsert);
const mockParticipantUpdate = vi.mocked(prisma.bookingParticipant.update);

const createRequest = (body?: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body ?? {}) }) as unknown as NextRequest;

describe("POST /api/trek-lead/trips/[id]/attendance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParticipantUpdate.mockResolvedValue({} as any);
    mockTripLogUpsert.mockResolvedValue({} as any);
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

    const response = await POST(createRequest({ attendees: [] }), {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 403 when user is not assigned", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockAssignmentFindUnique.mockResolvedValue(null);

    const response = await POST(
      createRequest({ attendees: [{ participantId: "p1", attended: true }] }),
      { params: Promise.resolve({ id: "slot-1" }) },
    );

    expect(response.status).toBe(403);
  });

  it("returns 404 when trip is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockAssignmentFindUnique.mockResolvedValue({ id: "a1" } as any);
    mockSlotFindUnique.mockResolvedValue(null);

    const response = await POST(
      createRequest({ attendees: [{ participantId: "p1", attended: true }] }),
      { params: Promise.resolve({ id: "slot-1" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 409 when slot is not active/started", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockAssignmentFindUnique.mockResolvedValue({ id: "a1" } as any);
    mockSlotFindUnique.mockResolvedValue({ date: new Date(), status: "UPCOMING" } as any);

    const response = await POST(
      createRequest({ attendees: [{ participantId: "p1", attended: true }] }),
      { params: Promise.resolve({ id: "slot-1" }) },
    );

    expect(response.status).toBe(409);
  });

  it("returns 403 when not slot day", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockAssignmentFindUnique.mockResolvedValue({ id: "a1" } as any);
    mockSlotFindUnique.mockResolvedValue({ date: new Date(), status: "ACTIVE" } as any);
    mockIsSlotDayToday.mockReturnValue(false);

    const response = await POST(
      createRequest({ attendees: [{ participantId: "p1", attended: true }] }),
      { params: Promise.resolve({ id: "slot-1" }) },
    );

    expect(response.status).toBe(403);
  });

  it("saves attendance and returns success", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockAssignmentFindUnique.mockResolvedValue({ id: "a1" } as any);
    mockSlotFindUnique.mockResolvedValue({ date: new Date(), status: "TREK_STARTED" } as any);
    mockIsSlotDayToday.mockReturnValue(true);

    const response = await POST(
      createRequest({
        attendees: [
          { participantId: "p1", attended: true },
          { participantId: "p2", attended: false },
        ],
      }),
      { params: Promise.resolve({ id: "slot-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, count: 2 });
    expect(mockTripLogUpsert).toHaveBeenCalledTimes(1);
    expect(mockParticipantUpdate).toHaveBeenCalledTimes(2);
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockAssignmentFindUnique.mockRejectedValue(new Error("db down"));

    const response = await POST(
      createRequest({ attendees: [{ participantId: "p1", attended: true }] }),
      { params: Promise.resolve({ id: "slot-1" }) },
    );

    expect(response.status).toBe(500);
  });
});
