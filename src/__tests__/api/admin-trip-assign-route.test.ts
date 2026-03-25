import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    slot: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tripAssignment: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { DELETE, PATCH, POST } from "@/app/api/admin/trips/[id]/assign/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockSlotFindUnique = vi.mocked(prisma.slot.findUnique);
const mockSlotUpdate = vi.mocked(prisma.slot.update);
const mockTripCreate = vi.mocked(prisma.tripAssignment.create);
const mockTripDeleteMany = vi.mocked(prisma.tripAssignment.deleteMany);

const createJsonRequest = (body: unknown, url = "http://localhost/api/admin/trips/slot-1/assign") =>
  ({
    json: vi.fn().mockResolvedValue(body),
    url,
  }) as unknown as NextRequest;

describe("/api/admin/trips/[id]/assign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PATCH returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await PATCH(createJsonRequest({ managerId: "m1" }), {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("PATCH validates managerId", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    const response = await PATCH(createJsonRequest({ managerId: "" }), {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(400);
  });

  it("PATCH returns 403 when manager role is invalid", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockUserFindUnique.mockResolvedValue({ status: "ACTIVE", role: { name: "REGISTERED_USER" } } as any);

    const response = await PATCH(createJsonRequest({ managerId: "u1" }), {
      params: Promise.resolve({ id: "slot-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Trip Manager role");
  });

  it("PATCH assigns manager for allowed role", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockUserFindUnique.mockResolvedValue({ status: "ACTIVE", role: { name: "TRIP_MANAGER" } } as any);
    mockSlotUpdate.mockResolvedValue({ id: "slot-1", manager: { id: "u1" } } as any);

    const response = await PATCH(createJsonRequest({ managerId: "u1" }), {
      params: Promise.resolve({ id: "slot-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.slot.id).toBe("slot-1");
  });

  it("POST returns 403 when caller cannot modify slot", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "manager-x" } as any);

    mockUserFindUnique.mockResolvedValueOnce({ role: { name: "TRIP_MANAGER" } } as any);
    mockSlotFindUnique.mockResolvedValueOnce({ managerId: "other-manager" } as any);

    const response = await POST(createJsonRequest({ userId: "lead-1" }), {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("POST creates assignment when caller is slot manager and target is trek lead", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "manager-1" } as any);

    mockUserFindUnique
      .mockResolvedValueOnce({ role: { name: "TRIP_MANAGER" } } as any)
      .mockResolvedValueOnce({ status: "ACTIVE", role: { name: "TREK_LEAD" } } as any);
    mockSlotFindUnique.mockResolvedValueOnce({ managerId: "manager-1" } as any);
    mockTripCreate.mockResolvedValue({ id: "assign-1", slotId: "slot-1", trekLeadId: "lead-1" } as any);

    const response = await POST(createJsonRequest({ userId: "lead-1" }), {
      params: Promise.resolve({ id: "slot-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.assignment.id).toBe("assign-1");
  });

  it("POST returns 409 on duplicate assignment", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin-1" } as any);

    mockUserFindUnique
      .mockResolvedValueOnce({ role: { name: "ADMIN" } } as any)
      .mockResolvedValueOnce({ status: "ACTIVE", role: { name: "TREK_LEAD" } } as any);
    mockSlotFindUnique.mockResolvedValueOnce({ managerId: "manager-2" } as any);
    mockTripCreate.mockRejectedValue({ code: "P2002" });

    const response = await POST(createJsonRequest({ userId: "lead-1" }), {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(409);
  });

  it("DELETE requires userId query parameter", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin-1" } as any);

    const response = await DELETE(
      createJsonRequest({}, "http://localhost/api/admin/trips/slot-1/assign"),
      { params: Promise.resolve({ id: "slot-1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("DELETE removes assignment when caller can modify", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin-1" } as any);

    mockUserFindUnique.mockResolvedValueOnce({ role: { name: "ADMIN" } } as any);
    mockSlotFindUnique.mockResolvedValueOnce({ managerId: "manager-1" } as any);
    mockTripDeleteMany.mockResolvedValue({ count: 1 } as any);

    const response = await DELETE(
      createJsonRequest({}, "http://localhost/api/admin/trips/slot-1/assign?userId=lead-1"),
      { params: Promise.resolve({ id: "slot-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockTripDeleteMany).toHaveBeenCalledWith({
      where: { slotId: "slot-1", trekLeadId: "lead-1" },
    });
  });
});
