import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    storyBlock: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/story/route";
import { prisma } from "@/lib/db";

const mockFindMany = vi.mocked(prisma.storyBlock.findMany);

describe("GET /api/story", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active story blocks ordered by order asc", async () => {
    const blocks = [{ id: "b1", title: "Our Beginning", order: 1 }];
    mockFindMany.mockResolvedValue(blocks as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.blocks).toEqual(blocks);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
  });

  it("returns 500 on failure", async () => {
    mockFindMany.mockRejectedValue(new Error("db failed"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch story.");
  });
});
