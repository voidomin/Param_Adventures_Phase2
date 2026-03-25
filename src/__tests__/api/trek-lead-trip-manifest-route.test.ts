import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    tripAssignment: { findUnique: vi.fn() },
    slot: { findUnique: vi.fn() },
    booking: { findMany: vi.fn() },
  },
}));

import { GET } from "@/app/api/trek-lead/trips/[id]/manifest/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockAssignmentFindUnique = vi.mocked(prisma.tripAssignment.findUnique);
const mockSlotFindUnique = vi.mocked(prisma.slot.findUnique);
const mockBookingFindMany = vi.mocked(prisma.booking.findMany);

describe("GET /api/trek-lead/trips/[id]/manifest", () => {
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

  it("returns 403 when non-management user is not assigned", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockUserFindUnique.mockResolvedValue({ role: { name: "TREK_LEAD" } } as any);
    mockAssignmentFindUnique.mockResolvedValue(null);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns 404 when slot not found", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockUserFindUnique.mockResolvedValue({ role: { name: "TREK_LEAD" } } as any);
    mockAssignmentFindUnique.mockResolvedValue({ id: "a1" } as any);
    mockSlotFindUnique.mockResolvedValue(null);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns manifest for assigned trek lead", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockUserFindUnique.mockResolvedValue({ role: { name: "TREK_LEAD" } } as any);
    mockAssignmentFindUnique.mockResolvedValue({ id: "a1" } as any);
    mockSlotFindUnique.mockResolvedValue({ id: "slot-1" } as any);
    mockBookingFindMany.mockResolvedValue([{ id: "b1" }] as any);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.manifest).toHaveLength(1);
  });

  it("returns manifest for management role without assignment lookup", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "m1" } as any);
    mockUserFindUnique.mockResolvedValue({ role: { name: "ADMIN" } } as any);
    mockSlotFindUnique.mockResolvedValue({ id: "slot-1" } as any);
    mockBookingFindMany.mockResolvedValue([] as any);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockAssignmentFindUnique).not.toHaveBeenCalled();
  });

  it("allows assigned user when role lookup returns null", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockUserFindUnique.mockResolvedValue(null);
    mockAssignmentFindUnique.mockResolvedValue({ id: "a1" } as any);
    mockSlotFindUnique.mockResolvedValue({ id: "slot-1" } as any);
    mockBookingFindMany.mockResolvedValue([] as any);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(200);
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "t1" } as any);
    mockUserFindUnique.mockRejectedValue(new Error("db down"));

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(500);
  });
});
