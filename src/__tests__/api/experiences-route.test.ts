import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    experience: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/experiences/route";
import { prisma } from "@/lib/db";

const mockFindMany = vi.mocked(prisma.experience.findMany);

const createRequest = (url: string) => ({ url } as Request);

describe("GET /api/experiences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns experiences with default published filter", async () => {
    mockFindMany.mockResolvedValue([{ id: "e1" }] as any);

    const response = await GET(createRequest("http://localhost/api/experiences"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.experiences).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      include: {
        categories: {
          include: { category: true },
        },
      },
    });
  });

  it("applies category filter when categoryId is provided", async () => {
    mockFindMany.mockResolvedValue([] as any);

    await GET(createRequest("http://localhost/api/experiences?categoryId=cat-1"));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "PUBLISHED",
          categories: { some: { categoryId: "cat-1" } },
        },
      }),
    );
  });

  it("applies difficulty filter when difficulty is provided", async () => {
    mockFindMany.mockResolvedValue([] as any);

    await GET(createRequest("http://localhost/api/experiences?difficulty=HARD"));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "PUBLISHED",
          difficulty: "HARD",
        },
      }),
    );
  });

  it("applies both category and difficulty filters together", async () => {
    mockFindMany.mockResolvedValue([] as any);

    await GET(
      createRequest("http://localhost/api/experiences?categoryId=cat-1&difficulty=EASY"),
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "PUBLISHED",
          categories: { some: { categoryId: "cat-1" } },
          difficulty: "EASY",
        },
      }),
    );
  });

  it("returns 500 when query fails", async () => {
    mockFindMany.mockRejectedValue(new Error("db down"));

    const response = await GET(createRequest("http://localhost/api/experiences"));

    expect(response.status).toBe(500);
  });
});
