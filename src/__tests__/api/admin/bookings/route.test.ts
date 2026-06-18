import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    booking: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/admin/bookings/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindMany = vi.mocked(prisma.booking.findMany);
const mockCount = vi.mocked(prisma.booking.count);

describe("GET /api/admin/bookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await GET(new NextRequest("http://localhost/api/admin/bookings"));

    expect(response.status).toBe(401);
  });

  it("returns bookings with filters", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockResolvedValue([{ id: "b1" }] as any);
    mockCount.mockResolvedValue(1);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/bookings?status=CONFIRMED&experienceId=exp-1",
      ),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.bookings).toHaveLength(1);
    // The where clause should have the status, experienceId, deletedAt, and
    // the active-booking OR condition (slot null OR slot matches active criteria)
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          bookingStatus: "CONFIRMED",
          experienceId: "exp-1",
          deletedAt: null,
          OR: expect.arrayContaining([
            { slotId: null },
            expect.objectContaining({ slot: expect.anything() }),
          ]),
        }),
        orderBy: { createdAt: "desc" },
      }),
    );
  });

  it("returns bookings without optional filters", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockResolvedValue([] as any);
    mockCount.mockResolvedValue(0);

    const response = await GET(new NextRequest("http://localhost/api/admin/bookings"));

    expect(response.status).toBe(200);
    // Without filters, whereClause still has deletedAt and the active-booking OR clause
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          OR: expect.arrayContaining([
            { slotId: null },
            expect.objectContaining({ slot: expect.anything() }),
          ]),
        }),
      }),
    );
  });

  it("returns archived bookings when archived=true", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockResolvedValue([{ id: "b2" }] as any);
    mockCount.mockResolvedValue(1);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/bookings?archived=true"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.bookings).toHaveLength(1);
    // When archived=true, the whereClause should have a slot condition (not an OR with slotId null)
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          slot: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ completedAt: expect.anything() }),
              expect.objectContaining({ trekEndedAt: expect.anything() }),
            ]),
          }),
        }),
      }),
    );
  });

  it("returns 500 on query failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockRejectedValue(new Error("db down"));

    const response = await GET(new NextRequest("http://localhost/api/admin/bookings"));

    expect(response.status).toBe(500);
  });
});
