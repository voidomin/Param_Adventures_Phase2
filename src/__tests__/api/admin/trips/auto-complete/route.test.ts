import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/trip-lifecycle", () => ({ autoCompletePastTrips: vi.fn() }));

import { POST } from "@/app/api/admin/trips/auto-complete/route";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { autoCompletePastTrips } from "@/lib/trip-lifecycle";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockLogActivity = vi.mocked(logActivity);
const mockAutoComplete = vi.mocked(autoCompletePastTrips);

const createRequest = (headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api/admin/trips/auto-complete", {
    method: "POST",
    headers,
  });

describe("POST /api/admin/trips/auto-complete", () => {
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
    mockAutoComplete.mockResolvedValue({ completedCount: 2, unlockedBookingsCount: 5 });

    const response = await POST(createRequest({ "x-cron-secret": "secret-123" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.completedCount).toBe(2);
    expect(data.unlockedBookingsCount).toBe(5);
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it("delegates to autoCompletePastTrips and logs activity for an authenticated actor", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockAutoComplete.mockResolvedValue({ completedCount: 1, unlockedBookingsCount: 3 });

    const response = await POST(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.completedCount).toBe(1);
    expect(mockAutoComplete).toHaveBeenCalledTimes(1);
    expect(mockLogActivity).toHaveBeenCalledWith(
      "TRIP_AUTO_COMPLETE",
      "a1",
      "Slot",
      "bulk",
      { completedCount: 1, unlockedBookingsCount: 3 },
    );
  });

  it("returns 500 on unexpected failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockAutoComplete.mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest());

    expect(response.status).toBe(500);
  });
});
