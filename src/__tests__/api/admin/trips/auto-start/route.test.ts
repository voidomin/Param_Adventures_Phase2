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
vi.mock("@/lib/trip-lifecycle", () => ({ autoStartTrips: vi.fn() }));

import { POST } from "@/app/api/admin/trips/auto-start/route";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { autoStartTrips } from "@/lib/trip-lifecycle";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockLogActivity = vi.mocked(logActivity);
const mockAutoStart = vi.mocked(autoStartTrips);

const createRequest = (headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api/admin/trips/auto-start", {
    method: "POST",
    headers,
  });

describe("POST /api/admin/trips/auto-start", () => {
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
    mockAutoStart.mockResolvedValue({ startedCount: 2, skippedUnstaffedCount: 1 });

    const response = await POST(createRequest({ "x-cron-secret": "secret-123" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.startedCount).toBe(2);
    expect(data.skippedUnstaffedCount).toBe(1);
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it("delegates to autoStartTrips and logs activity for an authenticated actor", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockAutoStart.mockResolvedValue({ startedCount: 3, skippedUnstaffedCount: 0 });

    const response = await POST(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.startedCount).toBe(3);
    expect(mockAutoStart).toHaveBeenCalledTimes(1);
    expect(mockLogActivity).toHaveBeenCalledWith(
      "TRIP_AUTO_START",
      "a1",
      "Slot",
      "bulk",
      { startedCount: 3, skippedUnstaffedCount: 0 },
    );
  });

  it("returns 500 on unexpected failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockAutoStart.mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest());

    expect(response.status).toBe(500);
  });
});
