import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    slot: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/manager/trips/[id]/start/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockSlotFindUnique = vi.mocked(prisma.slot.findUnique);
const mockSlotUpdate = vi.mocked(prisma.slot.update);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);

describe("POST /api/manager/trips/[id]/start", () => {
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

  it("returns 404 when trip is not found", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      userId: "m1",
    } as any);
    mockSlotFindUnique.mockResolvedValue(null);

    const response = await POST({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Trip not found.");
  });

  it("returns 403 for unassigned non-admin user", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      userId: "m1",
    } as any);
    mockSlotFindUnique.mockResolvedValue({
      managerId: "m2",
      status: "UPCOMING",
      assignments: [{ id: "a1" }],
    } as any);
    mockUserFindUnique.mockResolvedValue({ role: { name: "TRIP_MANAGER" } } as any);

    const response = await POST({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Only the assigned manager can start this trip.");
  });

  it("returns 409 when trip status is not UPCOMING", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "m1" } as any);
    mockSlotFindUnique.mockResolvedValue({
      managerId: "m1",
      status: "ACTIVE",
      assignments: [{ id: "a1" }],
    } as any);
    mockUserFindUnique.mockResolvedValue({ role: { name: "TRIP_MANAGER" } } as any);

    const response = await POST({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(409);
  });

  it("returns 422 when no trek leads are assigned", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "m1" } as any);
    mockSlotFindUnique.mockResolvedValue({
      managerId: "m1",
      status: "UPCOMING",
      assignments: [],
    } as any);
    mockUserFindUnique.mockResolvedValue({ role: { name: "TRIP_MANAGER" } } as any);

    const response = await POST({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toContain("Cannot start the trip");
  });

  it("starts trip for assigned manager", async () => {
    const startedAt = new Date("2026-01-01T00:00:00.000Z");

    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "m1" } as any);
    mockSlotFindUnique.mockResolvedValue({
      managerId: "m1",
      status: "UPCOMING",
      assignments: [{ id: "a1" }],
    } as any);
    mockUserFindUnique.mockResolvedValue({ role: { name: "TRIP_MANAGER" } } as any);
    mockSlotUpdate.mockResolvedValue({ status: "ACTIVE", startedAt } as any);

    const response = await POST({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.status).toBe("ACTIVE");
    expect(mockSlotUpdate).toHaveBeenCalledWith({
      where: { id: "slot-1" },
      data: { status: "ACTIVE", startedAt: expect.any(Date) },
    });
  });

  it("allows admin to start trip even if not assigned", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockSlotFindUnique.mockResolvedValue({
      managerId: "m1",
      status: "UPCOMING",
      assignments: [{ id: "a1" }],
    } as any);
    mockUserFindUnique.mockResolvedValue({ role: { name: "ADMIN" } } as any);
    mockSlotUpdate.mockResolvedValue({ status: "ACTIVE", startedAt: new Date() } as any);

    const response = await POST({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(200);
  });

  it("allows super admin to start trip even if not assigned", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "sa1" } as any);
    mockSlotFindUnique.mockResolvedValue({
      managerId: "m1",
      status: "UPCOMING",
      assignments: [{ id: "a1" }],
    } as any);
    mockUserFindUnique.mockResolvedValue({ role: { name: "SUPER_ADMIN" } } as any);
    mockSlotUpdate.mockResolvedValue({ status: "ACTIVE", startedAt: new Date() } as any);

    const response = await POST({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(200);
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "m1" } as any);
    mockSlotFindUnique.mockRejectedValue(new Error("db down"));

    const response = await POST({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to start trip.");
  });
});
