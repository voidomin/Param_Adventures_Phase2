import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    booking: { findUnique: vi.fn() },
    bookingParticipant: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { PATCH } from "@/app/api/bookings/[id]/participants/[participantId]/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const createRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;
const params = Promise.resolve({ id: "b1", participantId: "p1" });

const baseBooking = { id: "b1", userId: "u1" };
const baseParticipant = { id: "p1", bookingId: "b1", isCancelled: false };

describe("PATCH /api/bookings/[id]/participants/[participantId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(baseBooking as any);
    vi.mocked(prisma.bookingParticipant.findUnique).mockResolvedValue(baseParticipant as any);
    vi.mocked(prisma.bookingParticipant.update).mockResolvedValue({ ...baseParticipant, name: "Updated" } as any);
  });

  it("returns the auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false, response: { status: 401 } } as any);

    const response = await PATCH(createRequest({}), { params });
    expect((response as any).status).toBe(401);
  });

  it("returns 400 for an invalid body", async () => {
    const response = await PATCH(createRequest({ email: "not-an-email" }), { params });
    expect(response.status).toBe(400);
  });

  it("returns 404 when the booking doesn't exist", async () => {
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(null);

    const response = await PATCH(createRequest({ name: "New Name" }), { params });
    expect(response.status).toBe(404);
  });

  it("returns 403 when the booking belongs to a different user", async () => {
    vi.mocked(prisma.booking.findUnique).mockResolvedValue({ ...baseBooking, userId: "someone-else" } as any);

    const response = await PATCH(createRequest({ name: "New Name" }), { params });
    expect(response.status).toBe(403);
  });

  it("returns 404 when the participant doesn't belong to this booking", async () => {
    vi.mocked(prisma.bookingParticipant.findUnique).mockResolvedValue({ ...baseParticipant, bookingId: "other-booking" } as any);

    const response = await PATCH(createRequest({ name: "New Name" }), { params });
    expect(response.status).toBe(404);
  });

  it("returns 400 when trying to edit a cancelled participant", async () => {
    vi.mocked(prisma.bookingParticipant.findUnique).mockResolvedValue({ ...baseParticipant, isCancelled: true } as any);

    const response = await PATCH(createRequest({ name: "New Name" }), { params });
    expect(response.status).toBe(400);
  });

  it("updates participant details successfully", async () => {
    const response = await PATCH(createRequest({ name: "New Name" }), { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.bookingParticipant.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "p1" }, data: { name: "New Name" } }),
    );
  });

  it("computes age when a date of birth is provided", async () => {
    await PATCH(createRequest({ dateOfBirth: "2000-01-01" }), { params });

    expect(prisma.bookingParticipant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dateOfBirth: new Date("2000-01-01"), age: expect.any(Number) }),
      }),
    );
  });

  it("returns 500 on an unexpected error", async () => {
    vi.mocked(prisma.booking.findUnique).mockRejectedValue(new Error("db down"));

    const response = await PATCH(createRequest({ name: "New Name" }), { params });
    expect(response.status).toBe(500);
  });
});
