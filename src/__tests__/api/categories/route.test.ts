import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    category: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/categories/route";
import { prisma } from "@/lib/db";

const mockFindMany = vi.mocked(prisma.category.findMany);

describe("GET /api/categories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active categories in expected shape", async () => {
    const categories = [
      { id: "c1", name: "Trekking", slug: "trekking", icon: "mountain" },
    ];
    mockFindMany.mockResolvedValue(categories as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.categories).toEqual(categories);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
      },
    });
  });

  it("returns 500 on database error", async () => {
    mockFindMany.mockRejectedValue(new Error("db failed"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch categories.");
  });
});
