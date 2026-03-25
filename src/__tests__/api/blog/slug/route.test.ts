import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    blog: {
      findUnique: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/blog/[slug]/route";
import { prisma } from "@/lib/db";

const mockFindUnique = vi.mocked(prisma.blog.findUnique);

describe("GET /api/blog/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 for non-published blog", async () => {
    mockFindUnique.mockResolvedValue({
      status: "DRAFT",
      deletedAt: null,
    } as any);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ slug: "my-slug" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Blog not found.");
  });

  it("returns 404 for deleted blog", async () => {
    mockFindUnique.mockResolvedValue({
      status: "PUBLISHED",
      deletedAt: new Date(),
    } as any);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ slug: "my-slug" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns blog for published and non-deleted record", async () => {
    const blog = {
      id: "b1",
      status: "PUBLISHED",
      deletedAt: null,
      title: "Trip Story",
    };
    mockFindUnique.mockResolvedValue(blog as any);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ slug: "trip-story" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.blog).toEqual(blog);
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "trip-story" },
      }),
    );
  });
});
