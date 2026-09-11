import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  authorizeRequest: vi.fn(),
}));
vi.mock("@/services/booking.service", () => ({
  BookingService: { cancelAllBookingsForSlot: vi.fn() },
}));

import { POST } from "@/app/api/admin/trips/[id]/cancel-batch/route";
import { authorizeRequest } from "@/lib/api-auth";
import { BookingService } from "@/services/booking.service";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockCancelAll = vi.mocked(BookingService.cancelAllBookingsForSlot);

const createRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/admin/trips/slot-1/cancel-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const callRoute = (body: unknown) => POST(createRequest(body), { params: Promise.resolve({ id: "slot-1" }) });

describe("POST /api/admin/trips/[id]/cancel-batch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    } as any);

    const response = await callRoute({ reason: "weather" });

    expect(response.status).toBe(401);
  });

  it("returns 403 for an authenticated ADMIN who isn't SUPER_ADMIN", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1", roleName: "ADMIN" } as any);

    const response = await callRoute({ reason: "weather" });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toMatch(/super admin/i);
    expect(mockCancelAll).not.toHaveBeenCalled();
  });

  it("returns 400 when reason is missing or blank", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1", roleName: "SUPER_ADMIN" } as any);

    const response = await callRoute({ reason: "   " });

    expect(response.status).toBe(400);
    expect(mockCancelAll).not.toHaveBeenCalled();
  });

  it("delegates to BookingService and returns counts for a SUPER_ADMIN", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1", roleName: "SUPER_ADMIN" } as any);
    mockCancelAll.mockResolvedValue({ cancelledCount: 3, refundsQueuedCount: 2 });

    const response = await callRoute({ reason: "Poor weather forecast" });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cancelledCount).toBe(3);
    expect(data.refundsQueuedCount).toBe(2);
    expect(mockCancelAll).toHaveBeenCalledWith("slot-1", {
      reason: "Poor weather forecast",
      cancelledByUserId: "a1",
    });
  });

  it("returns 404 when the slot doesn't exist", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1", roleName: "SUPER_ADMIN" } as any);
    mockCancelAll.mockRejectedValue(new Error("SLOT_NOT_FOUND"));

    const response = await callRoute({ reason: "weather" });

    expect(response.status).toBe(404);
  });

  it("returns 400 when the slot isn't cancellable this way", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1", roleName: "SUPER_ADMIN" } as any);
    mockCancelAll.mockRejectedValue(new Error("SLOT_NOT_CANCELLABLE"));

    const response = await callRoute({ reason: "weather" });

    expect(response.status).toBe(400);
  });

  it("returns 500 on an unexpected failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1", roleName: "SUPER_ADMIN" } as any);
    mockCancelAll.mockRejectedValue(new Error("db exploded"));

    const response = await callRoute({ reason: "weather" });

    expect(response.status).toBe(500);
  });
});
