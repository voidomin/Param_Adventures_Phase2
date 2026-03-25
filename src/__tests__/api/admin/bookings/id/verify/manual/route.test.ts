import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendBookingConfirmation: vi.fn() }));
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
    $transaction: vi.fn(),
  },
}));

import { POST } from "@/app/api/admin/bookings/[id]/verify-manual/route";
import { revalidatePath } from "next/cache";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { sendBookingConfirmation } from "@/lib/email";
import { prisma } from "@/lib/db";

const mockRevalidatePath = vi.mocked(revalidatePath);
const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockLogActivity = vi.mocked(logActivity);
const mockSendBookingConfirmation = vi.mocked(sendBookingConfirmation);
const mockBookingFindUnique = vi.mocked(prisma.booking.findUnique);
const mockTransaction = vi.mocked(prisma.$transaction);

const createRequest = (body: unknown) =>
  ({
    json: vi.fn().mockResolvedValue(body),
  }) as unknown as NextRequest;

const validBody = {
  transactionId: "txn-1",
  amountPaid: 5000,
  paymentProofUrl: "https://cdn.example.com/proof.jpg",
  adminNotes: "Verified via bank transfer",
};

describe("POST /api/admin/bookings/[id]/verify-manual", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendBookingConfirmation.mockResolvedValue(undefined as any);
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await POST(createRequest(validBody), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(401);
  });

  it("passes through non-401 auth response", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as any);

    const response = await POST(createRequest(validBody), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns 403 for non-admin role", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "CUSTOMER",
      userId: "u1",
    } as any);

    const response = await POST(createRequest(validBody), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns 400 for invalid payload", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "ADMIN",
      userId: "a1",
    } as any);

    const response = await POST(
      createRequest({ transactionId: "", amountPaid: -1, paymentProofUrl: "bad" }),
      { params: Promise.resolve({ id: "b1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns 404 when booking is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "ADMIN",
      userId: "a1",
    } as any);
    mockBookingFindUnique.mockResolvedValue(null);

    const response = await POST(createRequest(validBody), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 400 when booking is already paid", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "SUPER_ADMIN",
      userId: "a1",
    } as any);
    mockBookingFindUnique.mockResolvedValue({
      id: "b1",
      paymentStatus: "PAID",
    } as any);

    const response = await POST(createRequest(validBody), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(400);
  });

  it("verifies manual payment, logs activity, and revalidates", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "ADMIN",
      userId: "a1",
    } as any);

    mockBookingFindUnique
      .mockResolvedValueOnce({
        id: "b1",
        slotId: "slot-1",
        participantCount: 2,
        paymentStatus: "PENDING",
      } as any)
      .mockResolvedValueOnce({
        id: "b1",
        participantCount: 2,
        totalPrice: 5000,
        user: { name: "Akash", email: "akash@example.com" },
        experience: { title: "Everest Base Camp" },
        slot: { date: new Date("2026-04-01T00:00:00.000Z") },
      } as any);

    mockTransaction.mockResolvedValue([{ id: "b1", bookingStatus: "CONFIRMED" }] as any);

    const response = await POST(createRequest(validBody), {
      params: Promise.resolve({ id: "b1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.booking.id).toBe("b1");
    expect(mockTransaction).toHaveBeenCalled();
    expect(mockLogActivity).toHaveBeenCalledWith(
      "MANUAL_PAYMENT_VERIFIED",
      "a1",
      "Booking",
      "b1",
      expect.objectContaining({ transactionId: "txn-1", amount: 5000 }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("skips confirmation email when second booking lookup has no slot", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "ADMIN",
      userId: "a1",
    } as any);

    mockBookingFindUnique
      .mockResolvedValueOnce({
        id: "b1",
        slotId: "slot-1",
        participantCount: 2,
        paymentStatus: "PENDING",
      } as any)
      .mockResolvedValueOnce({
        id: "b1",
        participantCount: 2,
        totalPrice: 5000,
        user: { name: "Akash", email: "akash@example.com" },
        experience: { title: "Everest Base Camp" },
        slot: null,
      } as any);

    mockTransaction.mockResolvedValue([{ id: "b1", bookingStatus: "CONFIRMED" }] as any);

    const response = await POST(createRequest(validBody), {
      params: Promise.resolve({ id: "b1" }),
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(response.status).toBe(200);
    expect(mockSendBookingConfirmation).not.toHaveBeenCalled();
  });

  it("skips confirmation email when second booking lookup returns null", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "ADMIN",
      userId: "a1",
    } as any);

    mockBookingFindUnique
      .mockResolvedValueOnce({
        id: "b1",
        slotId: "slot-1",
        participantCount: 2,
        paymentStatus: "PENDING",
      } as any)
      .mockResolvedValueOnce(null);

    mockTransaction.mockResolvedValue([{ id: "b1", bookingStatus: "CONFIRMED" }] as any);

    const response = await POST(createRequest(validBody), {
      params: Promise.resolve({ id: "b1" }),
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(response.status).toBe(200);
    expect(mockSendBookingConfirmation).not.toHaveBeenCalled();
  });

  it("returns 500 when transaction fails", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "ADMIN",
      userId: "a1",
    } as any);
    mockBookingFindUnique.mockResolvedValue({
      id: "b1",
      slotId: "slot-1",
      participantCount: 2,
      paymentStatus: "PENDING",
    } as any);
    mockTransaction.mockRejectedValueOnce(new Error("txn failed"));

    const response = await POST(createRequest(validBody), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(500);
  });

  it("returns 500 when audit logging fails", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "ADMIN",
      userId: "a1",
    } as any);
    mockBookingFindUnique.mockResolvedValue({
      id: "b1",
      slotId: "slot-1",
      participantCount: 2,
      paymentStatus: "PENDING",
    } as any);
    mockTransaction.mockResolvedValue([{ id: "b1", bookingStatus: "CONFIRMED" }] as any);
    mockLogActivity.mockRejectedValueOnce(new Error("audit failed"));

    const response = await POST(createRequest(validBody), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(500);
  });

  it("returns 500 on unexpected failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "ADMIN",
      userId: "a1",
    } as any);
    mockBookingFindUnique.mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest(validBody), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(500);
  });
});
