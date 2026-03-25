import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    booking: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/admin/trips/[id]/manifest/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindMany = vi.mocked(prisma.booking.findMany);

describe("GET /api/admin/trips/[id]/manifest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns confirmed booking manifest", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockResolvedValue([
      {
        id: "b1",
        slotId: "slot-1",
        bookingStatus: "CONFIRMED",
        participants: [{ name: "P1" }],
        user: { id: "u1", name: "A", email: "a@example.com", phoneNumber: "999" },
      },
    ] as any);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.manifest).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { slotId: "slot-1", bookingStatus: "CONFIRMED" },
      include: {
        participants: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  });

  it("returns empty manifest when no confirmed bookings exist", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockResolvedValue([] as any);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "slot-empty" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.manifest).toEqual([]);
  });

  it("uses route param slot id in booking query", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockResolvedValue([] as any);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "slot-xyz" }),
    });

    expect(response.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ slotId: "slot-xyz" }),
      }),
    );
  });

  it("returns 500 when booking query fails", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockRejectedValue(new Error("db down"));

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "slot-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch manifest.");
  });
});
