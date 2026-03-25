import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/admin/users/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindMany = vi.mocked(prisma.user.findMany);
const mockCount = vi.mocked(prisma.user.count);

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/users"),
    );

    expect(response.status).toBe(401);
  });

  it("returns users with pagination and stats", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    mockFindMany.mockResolvedValue([{ id: "u1", name: "Alex" }] as any);
    mockCount
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(40)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(5);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/users?role=TREK_LEAD&search=al&page=2&limit=10",
      ),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.users).toHaveLength(1);
    expect(data.pagination).toEqual({
      total: 12,
      page: 2,
      limit: 10,
      totalPages: 2,
    });
    expect(data.stats).toEqual({
      total: 40,
      admins: 5,
      customers: 30,
      trekLeads: 5,
    });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "ACTIVE",
          role: { name: "TREK_LEAD" },
          OR: expect.any(Array),
        }),
        skip: 10,
        take: 10,
      }),
    );
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockRejectedValue(new Error("db down"));

    const response = await GET(
      new NextRequest("http://localhost/api/admin/users"),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch users.");
  });
});
