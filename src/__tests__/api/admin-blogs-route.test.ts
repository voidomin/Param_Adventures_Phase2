import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    blog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/admin/blogs/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindMany = vi.mocked(prisma.blog.findMany);
const mockCount = vi.mocked(prisma.blog.count);

describe("GET /api/admin/blogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await GET(new NextRequest("http://localhost/api/admin/blogs"));

    expect(response.status).toBe(401);
  });

  it("returns paginated admin blog list", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockResolvedValue([{ id: "b1" }] as any);
    mockCount.mockResolvedValue(11);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/blogs?status=PENDING_REVIEW&page=2&limit=5"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.blogs).toHaveLength(1);
    expect(data.pagination.totalPages).toBe(3);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null, status: "PENDING_REVIEW" },
        skip: 5,
        take: 5,
      }),
    );
  });
});
