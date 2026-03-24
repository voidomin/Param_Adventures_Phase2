import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../app/api/admin/bookings/[id]/refund/route";
import { prisma } from "../lib/db";
import { authorizeRequest } from "../lib/api-auth";
import { logActivity } from "../lib/audit-logger";
import { sendRefundResolved } from "../lib/email";
import { NextRequest } from "next/server";

vi.mock("../lib/db", () => ({
  prisma: {
    booking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../lib/api-auth");
vi.mock("../lib/audit-logger");
vi.mock("../lib/email");

describe("POST /api/admin/bookings/[id]/refund", () => {
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
    vi.mocked(authorizeRequest).mockResolvedValue({ authorized: true, userId: "a1", roleName: "ADMIN" });
    const req = createRequest({}); // missing refundNote
    const result = await POST(req, { params: Promise.resolve({ id: "b1" }) });
    expect(result.status).toBe(400);
  });

  it("returns 404 if booking not found", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({ authorized: true, userId: "a1", roleName: "ADMIN" });
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(null);
    const req = createRequest({ refundNote: "COUPON-123" });
    const result = await POST(req, { params: Promise.resolve({ id: "b1" }) });
    expect(result.status).toBe(404);
  });

  it("returns 409 if booking is not awaiting refund", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({ authorized: true, userId: "a1", roleName: "ADMIN" });
    vi.mocked(prisma.booking.findUnique).mockResolvedValue({ paymentStatus: "PAID" } as any);
    const req = createRequest({ refundNote: "COUPON-123" });
    const result = await POST(req, { params: Promise.resolve({ id: "b1" }) });
    expect(result.status).toBe(409);
  });

  it("successfully resolves a refund", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({ authorized: true, userId: "a1", roleName: "ADMIN" });
    const booking = {
      id: "b1",
      paymentStatus: "REFUND_PENDING",
      totalPrice: 100,
      refundPreference: "COUPON",
      experience: { title: "Test Trip" },
      slot: { date: new Date() },
      user: { name: "Tester", email: "test@example.com" },
    };
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(booking as any);
    vi.mocked(prisma.booking.update).mockResolvedValue({} as any);

    const req = createRequest({ refundNote: "CPN100" });
    const result = await POST(req, { params: Promise.resolve({ id: "b1" }) });

    expect(result.status).toBe(200);
    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { paymentStatus: "REFUNDED", refundNote: "CPN100" },
    });
    expect(logActivity).toHaveBeenCalled();
    expect(sendRefundResolved).toHaveBeenCalled();
  });

  it("returns 500 on internal error", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({ authorized: true, userId: "a1", roleName: "ADMIN" });
    vi.mocked(prisma.booking.findUnique).mockRejectedValue(new Error("Database error"));
    const req = createRequest({ refundNote: "123" });
    const result = await POST(req, { params: Promise.resolve({ id: "b1" }) });
    expect(result.status).toBe(500);
  });
});
