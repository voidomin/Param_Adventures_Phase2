import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    experience: { findMany: vi.fn() },
    blog: { findMany: vi.fn() },
    platformSetting: { findMany: vi.fn().mockResolvedValue([]) },
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

  it("includes one author page per distinct non-official author of a published post", async () => {
    mockExperienceFindMany.mockResolvedValue([] as any);
    mockBlogFindMany
      .mockResolvedValueOnce([{ slug: "winter-treks", updatedAt: new Date("2026-01-02") }] as any)
      .mockResolvedValueOnce([{ authorId: "author-1" }, { authorId: "author-2" }] as any);

    const result = await sitemap();

    expect(result.some((entry) => entry.url.endsWith("/authors/author-1"))).toBe(true);
    expect(result.some((entry) => entry.url.endsWith("/authors/author-2"))).toBe(true);

    expect(mockBlogFindMany).toHaveBeenLastCalledWith({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        author: { role: { name: { notIn: ["ADMIN", "SUPER_ADMIN", "MEDIA_UPLOADER"] } } },
      },
      select: { authorId: true },
      distinct: ["authorId"],
    });
  });
});
