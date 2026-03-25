import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    experience: {
      findUnique: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/experiences/[slug]/route";
import { prisma } from "@/lib/db";

const mockFindUnique = vi.mocked(prisma.experience.findUnique);

describe("GET /api/experiences/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when experience is not found", async () => {
    mockFindUnique.mockResolvedValue(null);

    const response = await GET({} as Request, {
      params: Promise.resolve({ slug: "everest" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Experience not found");
  });

  it("returns 404 when experience is not published", async () => {
    mockFindUnique.mockResolvedValue({ id: "e1", status: "DRAFT" } as any);

    const response = await GET({} as Request, {
      params: Promise.resolve({ slug: "everest" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns published experience details", async () => {
    mockFindUnique.mockResolvedValue({
      id: "e1",
      slug: "everest",
      status: "PUBLISHED",
      categories: [],
      slots: [],
    } as any);

    const response = await GET({} as Request, {
      params: Promise.resolve({ slug: "everest" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("e1");
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "everest" },
      }),
    );
  });

  it("returns 500 on unexpected error", async () => {
    mockFindUnique.mockRejectedValue(new Error("db down"));

    const response = await GET({} as Request, {
      params: Promise.resolve({ slug: "everest" }),
    });

    expect(response.status).toBe(500);
  });
});
