import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const mockPrisma = {
    slot: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tripAssignment: {
      deleteMany: vi.fn(),
    },
    tripLog: {
      deleteMany: vi.fn(),
    },
    booking: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { prisma: mockPrisma, runWithRetry: vi.fn((fn) => fn()) };
});

import {
  DELETE,
  PATCH,
} from "@/app/api/admin/experiences/[id]/slots/[slotId]/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockSlotFindUnique = vi.mocked(prisma.slot.findUnique);
const mockSlotUpdate = vi.mocked(prisma.slot.update);

const mockTransaction = vi.mocked(prisma.$transaction);
const mockBookingFindMany = vi.mocked(prisma.booking.findMany);

const createJsonRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

describe("/api/admin/experiences/[id]/slots/[slotId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBookingFindMany.mockResolvedValue([]);
    mockTransaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === "function") return arg(prisma);
      return arg;
    });
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

  it("PATCH returns 400 when setting departure date to a past date on uncompleted slot", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockSlotFindUnique.mockResolvedValue({
      id: "slot-1",
      experienceId: "exp-1",
      capacity: 20,
      remainingCapacity: 10,
      status: "UPCOMING",
    } as any);

    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const response = await PATCH(createJsonRequest({ date: pastDate }), {
      params: Promise.resolve({ id: "exp-1", slotId: "slot-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Departure date cannot be set to a past date");
  });

  it("PATCH allows setting past date when slot status is COMPLETED", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockSlotFindUnique.mockResolvedValue({
      id: "slot-1",
      experienceId: "exp-1",
      capacity: 20,
      remainingCapacity: 10,
      status: "COMPLETED",
    } as any);

    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    mockSlotUpdate.mockResolvedValue({ id: "slot-1", date: new Date(pastDate), status: "COMPLETED" } as any);

    const response = await PATCH(createJsonRequest({ date: pastDate }), {
      params: Promise.resolve({ id: "exp-1", slotId: "slot-1" }),
    });

    expect(response.status).toBe(200);
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

    // A future date relative to whenever this test actually runs, so it
    // never ages into the past and starts tripping a past-date guard.
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    futureDate.setUTCHours(10, 0, 0, 0);

    const response = await PATCH(
      createJsonRequest({ date: futureDate.toISOString(), capacity: 25 }),
      { params: Promise.resolve({ id: "exp-1", slotId: "slot-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.slot.id).toBe("slot-1");
    expect(mockSlotUpdate).toHaveBeenCalledWith({
      where: { id: "slot-1" },
      data: {
        date: futureDate,
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

  it("PATCH updates date only and keeps existing capacity", async () => {
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
      capacity: 20,
      remainingCapacity: 8,
    } as any);

    const response = await PATCH(
      createJsonRequest({ date: "2026-08-22T10:00:00.000Z" }),
      {
        params: Promise.resolve({ id: "exp-1", slotId: "slot-1" }),
      },
    );

    expect(response.status).toBe(200);
    expect(mockSlotUpdate).toHaveBeenCalledWith({
      where: { id: "slot-1" },
      data: {
        date: new Date("2026-08-22T10:00:00.000Z"),
        capacity: 20,
        remainingCapacity: 8,
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

  it("DELETE returns 403 when user is not SUPER_ADMIN or ADMIN", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      userId: "user-1",
      roleName: "TREK_LEAD",
    } as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "exp-1", slotId: "slot-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("DELETE returns 404 when slot is not found", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "ADMIN" } as any);
    mockSlotFindUnique.mockResolvedValue({ id: "slot-1", experienceId: "exp-other" } as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "exp-1", slotId: "slot-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("DELETE removes slot when there are no bookings", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "ADMIN" } as any);
    mockSlotFindUnique.mockResolvedValue({
      id: "slot-1",
      experienceId: "exp-1",
      status: "UPCOMING",
    } as any);
    mockBookingFindMany.mockResolvedValue([]);
    mockTransaction.mockResolvedValue([[], [], [], { id: "slot-1" }] as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "exp-1", slotId: "slot-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockBookingFindMany).toHaveBeenCalledWith({
      where: {
        slotId: "slot-1",
        bookingStatus: { in: ["CONFIRMED", "REQUESTED"] },
      },
    });
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("DELETE processes 100% company refund hook and removes slot when slot has active bookings", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "ADMIN" } as any);
    mockSlotFindUnique.mockResolvedValue({
      id: "slot-1",
      experienceId: "exp-1",
      status: "UPCOMING",
    } as any);
    mockBookingFindMany.mockResolvedValue([
      {
        id: "b1",
        userId: "u1",
        slotId: "slot-1",
        baseFare: 1000,
        totalPrice: 1100,
        paidAmount: 1100,
        paymentType: "FULL",
        taxBreakdown: [],
        refundPreference: "BANK_REFUND",
      },
    ] as any);
    mockTransaction.mockImplementation(async (cb: any) =>
      cb({
        booking: { update: vi.fn().mockResolvedValue({}), updateMany: vi.fn().mockResolvedValue({}) },
        refundRequest: { upsert: vi.fn().mockResolvedValue({}) },
        travelCoupon: { create: vi.fn().mockResolvedValue({}) },
        couponTransaction: { create: vi.fn().mockResolvedValue({}) },
        tripAssignment: { deleteMany: vi.fn().mockResolvedValue({}) },
        tripLog: { deleteMany: vi.fn().mockResolvedValue({}) },
        slot: { delete: vi.fn().mockResolvedValue({}) },
      }),
    );

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "exp-1", slotId: "slot-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.processedRefundsCount).toBe(1);
  });

  it("DELETE returns 500 on unexpected error", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "ADMIN" } as any);
    mockSlotFindUnique.mockRejectedValue(new Error("db down"));

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "exp-1", slotId: "slot-1" }),
    });

    expect(response.status).toBe(500);
  });
});
