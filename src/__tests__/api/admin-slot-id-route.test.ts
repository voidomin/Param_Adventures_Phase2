import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    slot: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import {
  DELETE,
  PATCH,
} from "@/app/api/admin/experiences/[id]/slots/[slotId]/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockSlotFindUnique = vi.mocked(prisma.slot.findUnique);
const mockSlotUpdate = vi.mocked(prisma.slot.update);
const mockSlotDelete = vi.mocked(prisma.slot.delete);

const createJsonRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

describe("/api/admin/experiences/[id]/slots/[slotId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PATCH returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await PATCH(createJsonRequest({ capacity: 10 }), {
      params: Promise.resolve({ id: "exp-1", slotId: "slot-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("PATCH returns 400 when no fields provided", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    const response = await PATCH(createJsonRequest({}), {
      params: Promise.resolve({ id: "exp-1", slotId: "slot-1" }),
    });

    expect(response.status).toBe(400);
  });

  it("PATCH returns 400 for invalid date format", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    const response = await PATCH(createJsonRequest({ date: "not-a-date" }), {
      params: Promise.resolve({ id: "exp-1", slotId: "slot-1" }),
    });

    expect(response.status).toBe(400);
  });

  it("PATCH returns 404 when slot belongs to another experience", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockSlotFindUnique.mockResolvedValue({
      id: "slot-1",
      experienceId: "exp-other",
    } as any);

    const response = await PATCH(createJsonRequest({ capacity: 10 }), {
      params: Promise.resolve({ id: "exp-1", slotId: "slot-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("PATCH returns 400 when reducing below booked seats", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockSlotFindUnique.mockResolvedValue({
      id: "slot-1",
      experienceId: "exp-1",
      capacity: 20,
      remainingCapacity: 8,
      _count: { bookings: 12 },
    } as any);

    const response = await PATCH(createJsonRequest({ capacity: 10 }), {
      params: Promise.resolve({ id: "exp-1", slotId: "slot-1" }),
    });

    expect(response.status).toBe(400);
  });

  it("PATCH updates date/capacity and recomputes remaining seats", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockSlotFindUnique.mockResolvedValue({
      id: "slot-1",
      experienceId: "exp-1",
      capacity: 20,
      remainingCapacity: 8,
      _count: { bookings: 12 },
    } as any);
    mockSlotUpdate.mockResolvedValue({
      id: "slot-1",
      capacity: 25,
      remainingCapacity: 13,
    } as any);

    const response = await PATCH(
      createJsonRequest({ date: "2026-08-21T10:00:00.000Z", capacity: 25 }),
      { params: Promise.resolve({ id: "exp-1", slotId: "slot-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.slot.id).toBe("slot-1");
    expect(mockSlotUpdate).toHaveBeenCalledWith({
      where: { id: "slot-1" },
      data: {
        date: new Date("2026-08-21T10:00:00.000Z"),
        capacity: 25,
        remainingCapacity: 13,
      },
    });
  });

  it("PATCH updates capacity only without date", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockSlotFindUnique.mockResolvedValue({
      id: "slot-1",
      experienceId: "exp-1",
      capacity: 20,
      remainingCapacity: 8,
      _count: { bookings: 12 },
    } as any);
    mockSlotUpdate.mockResolvedValue({ id: "slot-1", capacity: 22, remainingCapacity: 10 } as any);

    const response = await PATCH(createJsonRequest({ capacity: 22 }), {
      params: Promise.resolve({ id: "exp-1", slotId: "slot-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockSlotUpdate).toHaveBeenCalledWith({
      where: { id: "slot-1" },
      data: {
        capacity: 22,
        remainingCapacity: 10,
      },
    });
  });

  it("PATCH returns 500 on unexpected error", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockSlotFindUnique.mockRejectedValue(new Error("db down"));

    const response = await PATCH(createJsonRequest({ capacity: 22 }), {
      params: Promise.resolve({ id: "exp-1", slotId: "slot-1" }),
    });

    expect(response.status).toBe(500);
  });

  it("DELETE returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "exp-1", slotId: "slot-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("DELETE returns 409 when active bookings exist", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockSlotFindUnique.mockResolvedValue({
      id: "slot-1",
      experienceId: "exp-1",
      _count: { bookings: 2 },
    } as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "exp-1", slotId: "slot-1" }),
    });

    expect(response.status).toBe(409);
  });

  it("DELETE returns 404 when slot is not found", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockSlotFindUnique.mockResolvedValue({ id: "slot-1", experienceId: "exp-other" } as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "exp-1", slotId: "slot-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("DELETE removes slot when no active bookings", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockSlotFindUnique.mockResolvedValue({
      id: "slot-1",
      experienceId: "exp-1",
      _count: { bookings: 0 },
    } as any);
    mockSlotDelete.mockResolvedValue({ id: "slot-1" } as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "exp-1", slotId: "slot-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockSlotDelete).toHaveBeenCalledWith({ where: { id: "slot-1" } });
  });

  it("DELETE returns 500 on unexpected error", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockSlotFindUnique.mockRejectedValue(new Error("db down"));

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "exp-1", slotId: "slot-1" }),
    });

    expect(response.status).toBe(500);
  });
});
