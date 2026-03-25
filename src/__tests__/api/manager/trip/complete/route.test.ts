import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendTripCompletedEmail: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    slot: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    tripLog: {
      upsert: vi.fn(),
    },
    booking: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { POST } from "@/app/api/manager/trips/[id]/complete/route";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { sendTripCompletedEmail } from "@/lib/email";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockLogActivity = vi.mocked(logActivity);
const mockSendTripCompletedEmail = vi.mocked(sendTripCompletedEmail);
const mockSlotFindUnique = vi.mocked(prisma.slot.findUnique);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockBookingFindMany = vi.mocked(prisma.booking.findMany);
const mockTransaction = vi.mocked(prisma.$transaction);

const createRequest = (body?: unknown) =>
  ({
    json: vi.fn().mockResolvedValue(body ?? {}),
  }) as unknown as NextRequest;

describe("POST /api/manager/trips/[id]/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockResolvedValue([] as any);
    mockSendTripCompletedEmail.mockResolvedValue(undefined as any);
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
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "m1" } as any);

    const response = await POST(
      createRequest({ managerNote: "a".repeat(2001) }),
      { params: Promise.resolve({ id: "slot-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Note is too long");
  });

  it("returns 404 when slot is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "m1" } as any);
    mockSlotFindUnique.mockResolvedValue(null);

    const response = await POST(createRequest({}), {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 403 when caller is not assigned manager and not admin", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "m1" } as any);
    mockSlotFindUnique.mockResolvedValue({ managerId: "m2", status: "TREK_ENDED" } as any);
    mockUserFindUnique.mockResolvedValue({ role: { name: "TRIP_MANAGER" } } as any);

    const response = await POST(createRequest({}), {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns 409 when trip is not TREK_ENDED", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "m1" } as any);
    mockSlotFindUnique.mockResolvedValue({ managerId: "m1", status: "ACTIVE" } as any);
    mockUserFindUnique.mockResolvedValue({ role: { name: "TRIP_MANAGER" } } as any);

    const response = await POST(createRequest({}), {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(409);
  });

  it("completes trip and sends completion emails", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "m1" } as any);
    mockSlotFindUnique.mockResolvedValue({ managerId: "m1", status: "TREK_ENDED" } as any);
    mockUserFindUnique.mockResolvedValue({ role: { name: "TRIP_MANAGER" } } as any);
    mockBookingFindMany.mockResolvedValue([
      {
        user: { name: "Alex", email: "alex@example.com" },
        experience: { title: "Snow Trek", slug: "snow-trek" },
      },
    ] as any);

    const response = await POST(
      createRequest({ managerNote: "  wrapped up well  " }),
      { params: Promise.resolve({ id: "slot-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, status: "COMPLETED" });
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockLogActivity).toHaveBeenCalledWith(
      "TRIP_COMPLETED",
      "m1",
      "Slot",
      "slot-1",
      { managerNote: "wrapped up well" },
    );
    expect(mockSendTripCompletedEmail).toHaveBeenCalledWith({
      userName: "Alex",
      userEmail: "alex@example.com",
      experienceTitle: "Snow Trek",
      experienceSlug: "snow-trek",
    });
  });

  it("allows admin completion when not assigned", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockSlotFindUnique.mockResolvedValue({ managerId: "m1", status: "TREK_ENDED" } as any);
    mockUserFindUnique.mockResolvedValue({ role: { name: "ADMIN" } } as any);
    mockBookingFindMany.mockResolvedValue([] as any);

    const response = await POST(createRequest({ managerNote: null }), {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(200);
  });

  it("allows super admin completion when not assigned", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "sa1" } as any);
    mockSlotFindUnique.mockResolvedValue({ managerId: "m1", status: "TREK_ENDED" } as any);
    mockUserFindUnique.mockResolvedValue({ role: { name: "SUPER_ADMIN" } } as any);
    mockBookingFindMany.mockResolvedValue([] as any);

    const response = await POST(createRequest({ managerNote: "ok" }), {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(200);
  });

  it("uses Adventurer fallback when attendee name is null", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "m1" } as any);
    mockSlotFindUnique.mockResolvedValue({ managerId: "m1", status: "TREK_ENDED" } as any);
    mockUserFindUnique.mockResolvedValue({ role: { name: "TRIP_MANAGER" } } as any);
    mockBookingFindMany.mockResolvedValue([
      {
        user: { name: null, email: "anon@example.com" },
        experience: { title: "Snow Trek", slug: "snow-trek" },
      },
    ] as any);

    const response = await POST(createRequest({ managerNote: "ok" }), {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockSendTripCompletedEmail).toHaveBeenCalledWith({
      userName: "Adventurer",
      userEmail: "anon@example.com",
      experienceTitle: "Snow Trek",
      experienceSlug: "snow-trek",
    });
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "m1" } as any);
    mockSlotFindUnique.mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest({}), {
      params: Promise.resolve({ id: "slot-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to complete trip.");
  });
});
