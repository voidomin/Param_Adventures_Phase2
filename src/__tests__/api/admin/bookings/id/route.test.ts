import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    booking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { DELETE } from "@/app/api/admin/bookings/[id]/route";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockLogActivity = vi.mocked(logActivity);
const mockBookingFindUnique = vi.mocked(prisma.booking.findUnique);
const mockBookingUpdate = vi.mocked(prisma.booking.update);

const createRequest = () => ({} as unknown as NextRequest);

describe("DELETE /api/admin/bookings/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBookingUpdate.mockResolvedValue({ id: "b1" } as any);
    mockLogActivity.mockResolvedValue(undefined as any);
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await DELETE(createRequest(), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 when booking is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockBookingFindUnique.mockResolvedValue(null);

    const response = await DELETE(createRequest(), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(404);
  });

  it("soft-deletes booking, logs activity, and returns 200", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockBookingFindUnique.mockResolvedValue({ id: "b1" } as any);

    const response = await DELETE(createRequest(), {
      params: Promise.resolve({ id: "b1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: {
        deletedAt: expect.any(Date),
      },
    });
    expect(mockLogActivity).toHaveBeenCalledWith(
      "BOOKING_ARCHIVED",
      "a1",
      "Booking",
      "b1",
      expect.objectContaining({ archivedAt: expect.any(Date) })
    );
  });

  it("returns 500 when database update fails", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockBookingFindUnique.mockResolvedValue({ id: "b1" } as any);
    mockBookingUpdate.mockRejectedValueOnce(new Error("db update failed"));

    const response = await DELETE(createRequest(), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(500);
  });
});
