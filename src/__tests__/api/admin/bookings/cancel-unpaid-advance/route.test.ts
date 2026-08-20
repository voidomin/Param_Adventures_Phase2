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
  BookingService: { autoCancelUnpaidAdvanceBookings: vi.fn() },
}));

import { POST } from "@/app/api/admin/bookings/cancel-unpaid-advance/route";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { BookingService } from "@/services/booking.service";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockLogActivity = vi.mocked(logActivity);
const mockAutoCancel = vi.mocked(BookingService.autoCancelUnpaidAdvanceBookings);

const createRequest = (headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api/admin/bookings/cancel-unpaid-advance", {
    method: "POST",
    headers,
  });

describe("POST /api/admin/bookings/cancel-unpaid-advance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "secret-123";
  });

  it("returns auth response when unauthorized and cron secret is invalid", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await POST(createRequest({ "x-cron-secret": "wrong" }));

    expect(response.status).toBe(401);
  });

  it("allows the run via a valid cron secret even when auth fails", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);
    mockAutoCancel.mockResolvedValue(3);

    const response = await POST(createRequest({ "x-cron-secret": "secret-123" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(3);
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it("returns a no-op message when nothing is due", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockAutoCancel.mockResolvedValue(0);

    const response = await POST(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(0);
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it("delegates to BookingService and logs activity for an authenticated actor", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockAutoCancel.mockResolvedValue(2);

    const response = await POST(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(2);
    expect(mockAutoCancel).toHaveBeenCalledTimes(1);
    expect(mockLogActivity).toHaveBeenCalledWith(
      "ADVANCE_BOOKING_AUTO_CANCEL",
      "a1",
      "Booking",
      "bulk",
      { cancelledCount: 2 },
    );
  });

  it("returns 500 on unexpected failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockAutoCancel.mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest());

    expect(response.status).toBe(500);
  });
});
