import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    experience: { findMany: vi.fn() },
    blog: { findMany: vi.fn() },
  },
}));

import sitemap from "@/app/sitemap";
import { prisma } from "@/lib/db";

const mockExperienceFindMany = vi.mocked(prisma.experience.findMany);
const mockBlogFindMany = vi.mocked(prisma.blog.findMany);

describe("app/sitemap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns static and dynamic pages", async () => {
    mockExperienceFindMany.mockResolvedValue([
      { slug: "kedarkantha", updatedAt: new Date("2026-01-01") },
    ] as any);
    mockBlogFindMany.mockResolvedValue([
      { slug: "winter-treks", updatedAt: new Date("2026-01-02") },
    ] as any);

    const result = await sitemap();

    expect(result.length).toBeGreaterThanOrEqual(7);
    expect(
      result.some((entry) => entry.url.endsWith("/experiences/kedarkantha")),
    ).toBe(true);
    expect(
      result.some((entry) => entry.url.endsWith("/blog/winter-treks")),
    ).toBe(true);
  });

  it("queries only published non-deleted entities", async () => {
    mockExperienceFindMany.mockResolvedValue([] as any);
    mockBlogFindMany.mockResolvedValue([] as any);

    await sitemap();

    expect(mockExperienceFindMany).toHaveBeenCalledWith({
      where: { status: "PUBLISHED", deletedAt: null },
      select: { slug: true, updatedAt: true },
    });

    expect(mockBlogFindMany).toHaveBeenCalledWith({
      where: { status: "PUBLISHED", deletedAt: null },
      select: { slug: true, updatedAt: true },
    });
  });
});
