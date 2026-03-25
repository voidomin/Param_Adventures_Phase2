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

  it("passes through non-401 auth response", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as any);

    const response = await GET(new NextRequest("http://localhost/api/admin/blogs"));

    expect(response.status).toBe(403);
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

  it("uses default pagination and no status filter when query params are absent", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockResolvedValue([] as any);
    mockCount.mockResolvedValue(0);

    const response = await GET(new NextRequest("http://localhost/api/admin/blogs"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination).toEqual({ total: 0, page: 1, limit: 20, totalPages: 0 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null },
        skip: 0,
        take: 20,
      }),
    );
  });

  it("clamps page and limit to minimum/maximum bounds", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockResolvedValue([] as any);
    mockCount.mockResolvedValue(2);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/blogs?page=0&limit=200"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(50);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 50,
      }),
    );
  });

  it("applies DRAFT status filter", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockResolvedValue([{ id: "b1", status: "DRAFT" }] as any);
    mockCount.mockResolvedValue(1);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/blogs?status=DRAFT"),
    );

    expect(response.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null, status: "DRAFT" },
      }),
    );
  });

  it("calculates totalPages with ceiling behavior", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockResolvedValue([{ id: "b1" }] as any);
    mockCount.mockResolvedValue(21);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/blogs?page=1&limit=20"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination.totalPages).toBe(2);
  });
});
