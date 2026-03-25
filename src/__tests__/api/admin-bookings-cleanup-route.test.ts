import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    booking: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { POST } from "@/app/api/admin/bookings/cleanup/route";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockLogActivity = vi.mocked(logActivity);
const mockFindMany = vi.mocked(prisma.booking.findMany);
const mockTransaction = vi.mocked(prisma.$transaction);

describe("POST /api/admin/bookings/cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "secret-123";
  });

  it("returns auth response when unauthorized and cron secret is invalid", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await POST(
      new NextRequest("http://localhost/api/admin/bookings/cleanup", {
        method: "POST",
        headers: { "x-cron-secret": "wrong" },
      }),
    );

    expect(response.status).toBe(401);
  });

  it("allows cleanup via valid cron secret even when auth fails", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);
    mockFindMany.mockResolvedValue([] as any);

    const response = await POST(
      new NextRequest("http://localhost/api/admin/bookings/cleanup", {
        method: "POST",
        headers: { "x-cron-secret": "secret-123" },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(0);
  });

  it("returns no-op response when no abandoned bookings exist", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockFindMany.mockResolvedValue([] as any);

    const response = await POST(
      new NextRequest("http://localhost/api/admin/bookings/cleanup", { method: "POST" }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ message: "No abandoned bookings found.", count: 0 });
  });

  it("cancels abandoned bookings, restores capacity, and logs activity", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockFindMany.mockResolvedValue([
      { id: "b1", slotId: "s1", participantCount: 2 },
      { id: "b2", slotId: null, participantCount: 1 },
    ] as any);

    const txBookingUpdate = vi.fn().mockResolvedValue(undefined);
    const txSlotUpdate = vi.fn().mockResolvedValue(undefined);

    mockTransaction.mockImplementation(async (cb: any) =>
      cb({
        booking: { update: txBookingUpdate },
        slot: { update: txSlotUpdate },
      }),
    );

    const response = await POST(
      new NextRequest("http://localhost/api/admin/bookings/cleanup", { method: "POST" }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(2);
    expect(txBookingUpdate).toHaveBeenCalledTimes(2);
    expect(txSlotUpdate).toHaveBeenCalledTimes(1);
    expect(mockLogActivity).toHaveBeenCalledWith(
      "BOOKING_CLEANUP",
      "a1",
      "Booking",
      "bulk",
      { restoredCount: 2 },
    );
  });

  it("returns 500 on unexpected failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockFindMany.mockRejectedValue(new Error("db down"));

    const response = await POST(
      new NextRequest("http://localhost/api/admin/bookings/cleanup", { method: "POST" }),
    );

    expect(response.status).toBe(500);
  });
});
