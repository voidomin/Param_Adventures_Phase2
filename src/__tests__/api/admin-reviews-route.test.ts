import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    experienceReview: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/admin/reviews/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindMany = vi.mocked(prisma.experienceReview.findMany);
const mockCount = vi.mocked(prisma.experienceReview.count);

describe("GET /api/admin/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/reviews"),
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "CUSTOMER",
    } as any);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/reviews"),
    );

    expect(response.status).toBe(403);
  });

  it("returns paginated review list", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "ADMIN",
    } as any);

    mockFindMany.mockResolvedValue([{ id: "r1" }] as any);
    mockCount.mockResolvedValue(11);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/reviews?page=2&limit=5&experienceId=exp-1",
      ),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.reviews).toHaveLength(1);
    expect(data.pagination.totalPages).toBe(3);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { experienceId: "exp-1" },
        skip: 5,
        take: 5,
      }),
    );
  });
});
