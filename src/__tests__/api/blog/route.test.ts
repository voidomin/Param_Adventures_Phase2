import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    blog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/blog/route";
import { prisma } from "@/lib/db";

const mockFindMany = vi.mocked(prisma.blog.findMany);
const mockCount = vi.mocked(prisma.blog.count);

const createRequest = (url: string) => ({ url }) as NextRequest;

describe("GET /api/blog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses defaults for pagination and returns computed totalPages", async () => {
    mockFindMany.mockResolvedValue([{ id: "b1", title: "One" }] as any);
    mockCount.mockResolvedValue(25);

    const response = await GET(createRequest("http://localhost/api/blog"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination).toEqual({
      total: 25,
      page: 1,
      limit: 12,
      totalPages: 3,
    });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 12,
      }),
    );
  });

  it("clamps page to minimum 1 and limit to maximum 24", async () => {
    mockFindMany.mockResolvedValue([] as any);
    mockCount.mockResolvedValue(7);

    const response = await GET(
      createRequest("http://localhost/api/blog?page=0&limit=100"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(24);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 24,
      }),
    );
  });

  it("applies provided page and limit to skip/take", async () => {
    mockFindMany.mockResolvedValue([] as any);
    mockCount.mockResolvedValue(50);

    const response = await GET(
      createRequest("http://localhost/api/blog?page=3&limit=10"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination).toEqual({
      total: 50,
      page: 3,
      limit: 10,
      totalPages: 5,
    });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      }),
    );
  });
});
