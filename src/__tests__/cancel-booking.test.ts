import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../app/api/bookings/[id]/cancel/route";
import { prisma } from "../lib/db";
import { authorizeRequest } from "../lib/api-auth";
import { logActivity } from "../lib/audit-logger";
import { sendBookingCancellation } from "../lib/email";
import { NextRequest } from "next/server";

vi.mock("../lib/db", () => ({
  prisma: {
    booking: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => {
       const tx = {
         booking: { update: vi.fn().mockResolvedValue({}) },
         slot: { update: vi.fn().mockResolvedValue({}) },
       };
       return await cb(tx);
    }),
  },
}));

vi.mock("../lib/api-auth");
vi.mock("../lib/audit-logger");
vi.mock("../lib/email");

describe("POST /api/bookings/[id]/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: any) => {
    return {
      json: vi.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  };

  it("returns 401 if unauthorized", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: false,
      response: { status: 401 } as any,
    });
    const req = createRequest({});
    const result = await POST(req, { params: Promise.resolve({ id: "b1" }) });
    expect(result.status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({ authorized: true, userId: "u1", roleName: "USER" });
    const req = createRequest({ reason: "too far" }); // missing preference
    const result = await POST(req, { params: Promise.resolve({ id: "b1" }) });
    expect(result.status).toBe(400);
  });

  it("returns 404 if booking not found", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({ authorized: true, userId: "u1", roleName: "USER" });
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(null);
    const req = createRequest({ preference: "COUPON" });
    const result = await POST(req, { params: Promise.resolve({ id: "b1" }) });
    expect(result.status).toBe(404);
  });

  it("returns 403 if booking belongs to someone else", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({ authorized: true, userId: "u1", roleName: "USER" });
    vi.mocked(prisma.booking.findUnique).mockResolvedValue({ userId: "u2" } as any);
    const req = createRequest({ preference: "COUPON" });
    const result = await POST(req, { params: Promise.resolve({ id: "b1" }) });
    expect(result.status).toBe(403);
  });

  it("returns 409 if already cancelled", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({ authorized: true, userId: "u1", roleName: "USER" });
    vi.mocked(prisma.booking.findUnique).mockResolvedValue({ 
      userId: "u1", 
      bookingStatus: "CANCELLED",
      paymentStatus: "PAID"
    } as any);
    const req = createRequest({ preference: "COUPON" });
    const result = await POST(req, { params: Promise.resolve({ id: "b1" }) });
    expect(result.status).toBe(409);
  });

  it("successfully cancels a confirmed booking", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({ authorized: true, userId: "u1", roleName: "USER" });
    const booking = {
      id: "b1",
      userId: "u1",
      bookingStatus: "CONFIRMED",
      paymentStatus: "PAID",
      participantCount: 2,
      slotId: "s1",
      slot: { date: new Date() },
      experience: { title: "Fun Trip" },
      user: { name: "Test", email: "test@example.com" },
    };
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(booking as any);

    const req = createRequest({ preference: "BANK_REFUND" });
    const result = await POST(req, { params: Promise.resolve({ id: "b1" }) });

    expect(result.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalledWith("BOOKING_CANCELLED", "u1", "Booking", "b1", expect.any(Object));
    expect(sendBookingCancellation).toHaveBeenCalled();
  });

  it("returns 500 on internal error", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({ authorized: true, userId: "u1", roleName: "USER" });
    vi.mocked(prisma.booking.findUnique).mockRejectedValue(new Error("Failure"));
    const req = createRequest({ preference: "COUPON" });
    const result = await POST(req, { params: Promise.resolve({ id: "b1" }) });
    expect(result.status).toBe(500);
  });
});
