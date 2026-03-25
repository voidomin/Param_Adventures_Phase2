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

import { GET } from "@/app/api/admin/bookings/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindMany = vi.mocked(prisma.booking.findMany);

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

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/bookings?status=CONFIRMED&experienceId=exp-1",
      ),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.bookings).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          bookingStatus: "CONFIRMED",
          experienceId: "exp-1",
          deletedAt: null,
        },
        orderBy: { createdAt: "desc" },
      }),
    );
  });

  it("returns bookings without optional filters", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockResolvedValue([] as any);

    const response = await GET(new NextRequest("http://localhost/api/admin/bookings"));

    expect(response.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null },
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
