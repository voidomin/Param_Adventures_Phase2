import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/services/booking.service", () => ({
  BookingService: {
    processBooking: vi.fn(),
  },
}));

import { NextRequest, NextResponse } from "next/server";
import { POST } from "@/app/api/bookings/route";
import { authorizeRequest } from "@/lib/api-auth";
import { BookingService } from "@/services/booking.service";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockProcessBooking = vi.mocked(BookingService.processBooking);

const createRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

const validPayload = {
  experienceId: "exp-1",
  slotId: "slot-1",
  participantCount: 2,
  participants: [
    { name: "A", isPrimary: true, age: 28 },
    { name: "B", age: 32 },
  ],
};

describe("POST /api/bookings", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await POST(createRequest(validPayload));
    expect(response.status).toBe(401);
  });

  it("returns 400 for validation failure (mismatched participants)", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);

    const response = await POST(
      createRequest({ ...validPayload, participantCount: 3 }),
    );
    expect(response.status).toBe(400);
  });

  it("creates booking and returns result on success", async () => {
    const successResult = {
      bookingId: "bk-1",
      orderId: "order_123",
      amount: 200000,
      currency: "INR",
      keyId: undefined
    };
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockProcessBooking.mockResolvedValueOnce(successResult);

    const response = await POST(createRequest(validPayload));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.bookingId).toBe("bk-1");
    expect(data.orderId).toBe("order_123");
    expect(mockProcessBooking).toHaveBeenCalledWith("u1", expect.any(Object));
  });

  it("returns 409 on INSUFFICIENT_CAPACITY", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockProcessBooking.mockRejectedValueOnce(new Error("INSUFFICIENT_CAPACITY"));

    const response = await POST(createRequest(validPayload));
    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toContain("Requested slots are no longer available");
  });

  it("returns 409 on OVERBOOKED (race condition)", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockProcessBooking.mockRejectedValueOnce(new Error("OVERBOOKED"));

    const response = await POST(createRequest(validPayload));
    expect(response.status).toBe(409);
  });

  it("returns 502 on PAYMENT_GATEWAY_ERROR", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockProcessBooking.mockRejectedValueOnce(new Error("PAYMENT_GATEWAY_ERROR"));

    const response = await POST(createRequest(validPayload));
    expect(response.status).toBe(502);
  });

  it("returns 500 for unexpected fatal errors", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockProcessBooking.mockRejectedValueOnce(new Error("Database explosion"));

    const response = await POST(createRequest(validPayload));
    expect(response.status).toBe(500);
  });
});
