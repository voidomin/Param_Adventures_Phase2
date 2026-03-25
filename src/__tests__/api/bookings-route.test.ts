import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const {
  mockOrdersCreate,
  MockRazorpay,
} = vi.hoisted(() => {
  const mockOrdersCreate = vi.fn();
  return {
    mockOrdersCreate,
    MockRazorpay: class {
      orders = { create: mockOrdersCreate };
      constructor() {}
    },
  };
});

vi.mock("razorpay", () => ({
  default: MockRazorpay,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/audit-logger", () => ({
  logActivity: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    experience: { findUnique: vi.fn() },
    slot: { findUnique: vi.fn(), update: vi.fn() },
    platformSetting: { findUnique: vi.fn() },
    booking: { create: vi.fn(), delete: vi.fn() },
    payment: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { POST } from "@/app/api/bookings/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/audit-logger";
import { revalidatePath } from "next/cache";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockExperienceFindUnique = vi.mocked(prisma.experience.findUnique);
const mockSlotFindUnique = vi.mocked(prisma.slot.findUnique);
const mockPlatformSettingFindUnique = vi.mocked(prisma.platformSetting.findUnique);
const mockBookingDelete = vi.mocked(prisma.booking.delete);
const mockSlotUpdate = vi.mocked(prisma.slot.update);
const mockPaymentCreate = vi.mocked(prisma.payment.create);
const mockTransaction = vi.mocked(prisma.$transaction);
const mockLogActivity = vi.mocked(logActivity);
const mockRevalidatePath = vi.mocked(revalidatePath);

const createRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

const validPayload = {
  experienceId: "exp-1",
  slotId: "slot-1",
  participantCount: 2,
  participants: [
    { name: "A", isPrimary: true, age: 28 },
    { name: "B", age: "32" },
  ],
};

describe("POST /api/bookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrdersCreate.mockReset();
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await POST(createRequest(validPayload));

    expect(response.status).toBe(401);
  });

  it("returns 400 when participant count and details mismatch", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);

    const response = await POST(
      createRequest({ ...validPayload, participantCount: 3 }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 404 when experience is not published", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockExperienceFindUnique.mockResolvedValue({ id: "exp-1", status: "DRAFT" } as any);
    mockSlotFindUnique.mockResolvedValue({ id: "slot-1", experienceId: "exp-1", remainingCapacity: 10 } as any);

    const response = await POST(createRequest(validPayload));

    expect(response.status).toBe(404);
  });

  it("returns 409 when not enough capacity", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockExperienceFindUnique.mockResolvedValue({ id: "exp-1", status: "PUBLISHED", basePrice: 1000 } as any);
    mockSlotFindUnique.mockResolvedValue({ id: "slot-1", experienceId: "exp-1", remainingCapacity: 1 } as any);

    const response = await POST(createRequest(validPayload));

    expect(response.status).toBe(409);
  });

  it("creates booking, payment, and razorpay order on success", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockExperienceFindUnique.mockResolvedValue({ id: "exp-1", status: "PUBLISHED", basePrice: 1000 } as any);
    mockSlotFindUnique.mockResolvedValue({ id: "slot-1", experienceId: "exp-1", remainingCapacity: 10 } as any);

    mockPlatformSettingFindUnique.mockResolvedValue({
      key: "taxConfig",
      value: JSON.stringify([{ name: "GST", percentage: 5 }]),
    } as any);

    mockTransaction.mockImplementation(async (cb: any) => {
      const tx = {
        booking: {
          create: vi.fn().mockResolvedValue({ id: "bk-1", totalPrice: 2000 }),
          delete: mockBookingDelete,
        },
        slot: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          update: mockSlotUpdate,
        },
      };
      return cb(tx);
    });

    mockOrdersCreate.mockResolvedValue({ id: "order_123" });
    mockPaymentCreate.mockResolvedValue({ id: "pay-1" } as any);
    mockLogActivity.mockResolvedValue(undefined);

    const response = await POST(createRequest(validPayload));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.bookingId).toBe("bk-1");
    expect(data.orderId).toBe("order_123");
    expect(data.amount).toBe(200000);
    expect(mockPaymentCreate).toHaveBeenCalled();
    expect(mockLogActivity).toHaveBeenCalledWith(
      "BOOKING_REQUESTED",
      "u1",
      "Booking",
      "bk-1",
      expect.objectContaining({ experienceId: "exp-1", slotId: "slot-1" }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("rolls back booking when razorpay order creation fails", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockExperienceFindUnique.mockResolvedValue({ id: "exp-1", status: "PUBLISHED", basePrice: 1000 } as any);
    mockSlotFindUnique.mockResolvedValue({ id: "slot-1", experienceId: "exp-1", remainingCapacity: 10 } as any);
    mockPlatformSettingFindUnique.mockResolvedValue(null);

    let txCall = 0;
    mockTransaction.mockImplementation(async (cb: any) => {
      txCall += 1;
      if (txCall === 1) {
        return cb({
          booking: {
            create: vi.fn().mockResolvedValue({ id: "bk-1", totalPrice: 2000 }),
            delete: mockBookingDelete,
          },
          slot: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            update: mockSlotUpdate,
          },
        });
      }

      return cb({
        booking: { delete: mockBookingDelete },
        slot: { update: mockSlotUpdate },
      });
    });

    mockOrdersCreate.mockRejectedValue(new Error("gateway down"));

    const response = await POST(createRequest(validPayload));
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toContain("Payment gateway unavailable");
    expect(mockBookingDelete).toHaveBeenCalledWith({ where: { id: "bk-1" } });
    expect(mockSlotUpdate).toHaveBeenCalledWith({
      where: { id: "slot-1" },
      data: { remainingCapacity: { increment: 2 } },
    });
  });

  it("returns 409 when transaction detects overbooking race", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockExperienceFindUnique.mockResolvedValue({ id: "exp-1", status: "PUBLISHED", basePrice: 1000 } as any);
    mockSlotFindUnique.mockResolvedValue({ id: "slot-1", experienceId: "exp-1", remainingCapacity: 10 } as any);
    mockPlatformSettingFindUnique.mockResolvedValue(null);

    mockTransaction.mockImplementation(async (cb: any) => {
      return cb({
        booking: { create: vi.fn().mockResolvedValue({ id: "bk-1", totalPrice: 2000 }) },
        slot: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      });
    });

    const response = await POST(createRequest(validPayload));

    expect(response.status).toBe(409);
  });
});
