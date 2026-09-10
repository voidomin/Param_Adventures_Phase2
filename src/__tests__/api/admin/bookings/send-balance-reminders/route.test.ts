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
  BookingService: { sendBalancePaymentReminders: vi.fn() },
}));

import { POST } from "@/app/api/admin/bookings/send-balance-reminders/route";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { BookingService } from "@/services/booking.service";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockLogActivity = vi.mocked(logActivity);
const mockSendReminders = vi.mocked(BookingService.sendBalancePaymentReminders);

const createRequest = (headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api/admin/bookings/send-balance-reminders", {
    method: "POST",
    headers,
  });

describe("POST /api/admin/bookings/send-balance-reminders", () => {
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
    mockSendReminders.mockResolvedValue({ firstSent: 2, finalSent: 1 });

    const response = await POST(createRequest({ "x-cron-secret": "secret-123" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.firstSent).toBe(2);
    expect(data.finalSent).toBe(1);
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it("returns a no-op message when nothing is due", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockSendReminders.mockResolvedValue({ firstSent: 0, finalSent: 0 });

    const response = await POST(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.firstSent).toBe(0);
    expect(data.finalSent).toBe(0);
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it("delegates to BookingService and logs activity for an authenticated actor", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockSendReminders.mockResolvedValue({ firstSent: 1, finalSent: 2 });

    const response = await POST(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.firstSent).toBe(1);
    expect(data.finalSent).toBe(2);
    expect(mockSendReminders).toHaveBeenCalledTimes(1);
    expect(mockLogActivity).toHaveBeenCalledWith(
      "BALANCE_PAYMENT_REMINDERS_SENT",
      "a1",
      "Booking",
      "bulk",
      { firstSent: 1, finalSent: 2 },
    );
  });

  it("returns 500 on unexpected failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockSendReminders.mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest());

    expect(response.status).toBe(500);
  });
});
