import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/bookings/[id]/verify-manual/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";

// Mocking dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    booking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      create: vi.fn(),
    },
    slot: {
      update: vi.fn(),
    },
    $transaction: vi.fn((ops) => Promise.all(ops)),
  },
}));

vi.mock("@/lib/api-auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendBookingConfirmation: vi.fn(),
}));

vi.mock("@/lib/audit-logger", () => ({
  logActivity: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("POST /api/admin/bookings/[id]/verify-manual", () => {
  const mockBookingId = "booking-123";
  const mockParams = Promise.resolve({ id: mockBookingId });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if unauthorized", async () => {
    (authorizeRequest as unknown).mockResolvedValue({ authorized: false, response: { status: 401 } });
    const req = new NextRequest("http://localhost/api", { method: "POST" });
    const res: any = await POST(req, { params: mockParams });
    expect(res.status).toBe(401);
  });

  it("returns 403 if not an admin", async () => {
    (authorizeRequest as unknown).mockResolvedValue({ authorized: true, roleName: "USER" });
    const req = new NextRequest("http://localhost/api", { method: "POST" });
    const res: any = await POST(req, { params: mockParams });
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid request body", async () => {
    (authorizeRequest as unknown).mockResolvedValue({ authorized: true, roleName: "ADMIN" });
    const req = new NextRequest("http://localhost/api", {
      method: "POST",
      body: JSON.stringify({ transactionId: "" }), // Missing fields
    });
    const res: any = await POST(req, { params: mockParams });
    expect(res.status).toBe(400);
  });

  it("returns 404 if booking not found", async () => {
    (authorizeRequest as unknown).mockResolvedValue({ authorized: true, roleName: "ADMIN" });
    (prisma.booking.findUnique as unknown).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api", {
      method: "POST",
      body: JSON.stringify({
        transactionId: "TXN123",
        amountPaid: 1000,
        paymentProofUrl: "https://example.com/proof.jpg",
      }),
    });

    const res: any = await POST(req, { params: mockParams });
    expect(res.status).toBe(404);
  });

  it("returns 400 if booking already paid", async () => {
    (authorizeRequest as unknown).mockResolvedValue({ authorized: true, roleName: "ADMIN" });
    (prisma.booking.findUnique as unknown).mockResolvedValue({ id: mockBookingId, paymentStatus: "PAID" });

    const req = new NextRequest("http://localhost/api", {
      method: "POST",
      body: JSON.stringify({
        transactionId: "TXN123",
        amountPaid: 1000,
        paymentProofUrl: "https://example.com/proof.jpg",
      }),
    });

    const res: any = await POST(req, { params: mockParams });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Booking is already paid");
  });

  it("successfully verifies booking and creates payment", async () => {
    const mockAuth = { authorized: true, roleName: "ADMIN", userId: "admin-1" };
    (authorizeRequest as unknown).mockResolvedValue(mockAuth);
    
    const mockBooking = {
      id: mockBookingId,
      paymentStatus: "PENDING",
      participantCount: 2,
      slotId: "slot-123",
      totalPrice: 2000,
      user: { name: "User", email: "user@test.com" },
      experience: { title: "Trek" },
      slot: { date: new Date() }
    };

    (prisma.booking.findUnique as unknown).mockResolvedValue(mockBooking);
    (prisma.$transaction as unknown).mockResolvedValue([{ ...mockBooking, paymentStatus: "PAID" }]);

    const req = new NextRequest("http://localhost/api", {
      method: "POST",
      body: JSON.stringify({
        transactionId: "TXN123",
        amountPaid: 2000,
        paymentProofUrl: "https://example.com/proof.jpg",
        adminNotes: "Received",
      }),
    });

    const res: any = await POST(req, { params: mockParams });
    expect(res.status).toBe(200);

    // Verify transaction calls
    expect(prisma.booking.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: mockBookingId },
      data: { bookingStatus: "CONFIRMED", paymentStatus: "PAID" }
    }));

    expect(prisma.payment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        providerPaymentId: "TXN123",
        amount: 2000,
        fullPayload: expect.objectContaining({ proofUrl: "https://example.com/proof.jpg" })
      })
    }));

    expect(prisma.slot.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "slot-123" },
      data: { remainingCapacity: { decrement: 2 } }
    }));

    expect(logActivity).toHaveBeenCalledWith("MANUAL_PAYMENT_VERIFIED", "admin-1", "Booking", mockBookingId, expect.anything());
  });

  it("handles internal errors with 500", async () => {
    (authorizeRequest as unknown).mockResolvedValue({ authorized: true, roleName: "ADMIN" });
    (prisma.booking.findUnique as unknown).mockRejectedValue(new Error("DB Fallure"));

    const req = new NextRequest("http://localhost/api", {
      method: "POST",
      body: JSON.stringify({
        transactionId: "TXN123",
        amountPaid: 1000,
        paymentProofUrl: "https://example.com/proof.jpg",
      }),
    });

    const res: any = await POST(req, { params: mockParams });
    expect(res.status).toBe(500);
  });
});
