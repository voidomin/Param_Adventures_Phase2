import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  authorizeRequest: vi.fn(),
  resolveCronAuthDenial: vi.fn((auth: any, request: any) => {
    if (auth.authorized) return null;
    const provided = request.headers.get("x-cron-secret");
    const expected = process.env.CRON_SECRET;
    if (provided && expected && provided === expected) return null;
    return auth.response;
  }),
}));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/services/booking.service", () => ({
  BookingService: { autoExpireAbandonedBookings: vi.fn() },
}));

import { POST } from "@/app/api/admin/bookings/cleanup/route";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { BookingService } from "@/services/booking.service";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockLogActivity = vi.mocked(logActivity);
const mockAutoExpire = vi.mocked(BookingService.autoExpireAbandonedBookings);

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
    mockAutoExpire.mockResolvedValue(0);

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
    mockAutoExpire.mockResolvedValue(0);

    const response = await POST(
      new NextRequest("http://localhost/api/admin/bookings/cleanup", { method: "POST" }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ message: "No abandoned bookings found.", count: 0 });
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it("delegates to BookingService.autoExpireAbandonedBookings and logs the resulting count", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockAutoExpire.mockResolvedValue(2);

    const response = await POST(
      new NextRequest("http://localhost/api/admin/bookings/cleanup", { method: "POST" }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(2);
    expect(mockAutoExpire).toHaveBeenCalledTimes(1);
    expect(mockLogActivity).toHaveBeenCalledWith(
      "BOOKING_CLEANUP",
      "a1",
      "Booking",
      "bulk",
      { restoredCount: 2 },
    );
  });

  it("does not log activity when triggered via cron secret (no authenticated actor)", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);
    mockAutoExpire.mockResolvedValue(3);

    const response = await POST(
      new NextRequest("http://localhost/api/admin/bookings/cleanup", {
        method: "POST",
        headers: { "x-cron-secret": "secret-123" },
      }),
    );

    expect(response.status).toBe(200);
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it("returns 500 on unexpected failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockAutoExpire.mockRejectedValue(new Error("db down"));

    const response = await POST(
      new NextRequest("http://localhost/api/admin/bookings/cleanup", { method: "POST" }),
    );

    expect(response.status).toBe(500);
  });
});
