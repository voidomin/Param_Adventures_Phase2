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

  it("allows SUPER_ADMIN role", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "SUPER_ADMIN",
    } as any);
    mockFindMany.mockResolvedValue([{ id: "r2" }] as any);
    mockCount.mockResolvedValue(1);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/reviews?experienceId=exp-2"),
    );

    expect(response.status).toBe(200);
  });

  it("uses default page and limit when params are missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "ADMIN",
    } as any);
    mockFindMany.mockResolvedValue([] as any);
    mockCount.mockResolvedValue(0);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/reviews"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination).toEqual({ total: 0, page: 1, limit: 20, totalPages: 0 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        skip: 0,
        take: 20,
      }),
    );
  });

  it("clamps limit to max 50", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "ADMIN" } as any);
    mockFindMany.mockResolvedValue([] as any);
    mockCount.mockResolvedValue(0);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/reviews?page=1&limit=999"),
    );

    expect(response.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 50,
      }),
    );
  });

  it("clamps limit minimum to 1", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "ADMIN" } as any);
    mockFindMany.mockResolvedValue([] as any);
    mockCount.mockResolvedValue(5);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/reviews?page=2&limit=0"),
    );

    expect(response.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 1,
        take: 1,
      }),
    );
  });

  it("clamps page minimum to 1", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "ADMIN" } as any);
    mockFindMany.mockResolvedValue([] as any);
    mockCount.mockResolvedValue(5);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/reviews?page=0&limit=10"),
    );

    expect(response.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 10,
      }),
    );
  });
});
