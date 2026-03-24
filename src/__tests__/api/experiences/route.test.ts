import { GET } from "@/app/api/experiences/route";
import { prisma } from "@/lib/db";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    experience: {
      findMany: vi.fn(),
    },
  },
}));

function createMockRequest(url: string) {
  return new Request(url);
}

describe("GET /api/experiences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches all published experiences with no filters", async () => {
    const mockData = [{ id: "1", title: "Trek 1" }];
    (prisma.experience.findMany as any).mockResolvedValueOnce(mockData);

    const req = createMockRequest("http://localhost:3000/api/experiences");
    const res = await GET(req);
    
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.experiences).toEqual(mockData);

    expect(prisma.experience.findMany).toHaveBeenCalledWith({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      include: {
        categories: { include: { category: true } }
      }
    });
  });

  it("filters experiences by categoryId", async () => {
    (prisma.experience.findMany as any).mockResolvedValueOnce([]);

    const req = createMockRequest("http://localhost:3000/api/experiences?categoryId=cat-123");
    await GET(req);
    
    expect(prisma.experience.findMany).toHaveBeenCalledWith({
      where: {
        status: "PUBLISHED",
        categories: { some: { categoryId: "cat-123" } }
      },
      orderBy: { createdAt: "desc" },
      include: {
        categories: { include: { category: true } }
      }
    });
  });

  it("filters experiences by difficulty", async () => {
    (prisma.experience.findMany as any).mockResolvedValueOnce([]);

    const req = createMockRequest("http://localhost:3000/api/experiences?difficulty=HARD");
    await GET(req);
    
    expect(prisma.experience.findMany).toHaveBeenCalledWith({
      where: {
        status: "PUBLISHED",
        difficulty: "HARD"
      },
      orderBy: { createdAt: "desc" },
      include: {
        categories: { include: { category: true } }
      }
    });
  });

  it("combines multiple filters correctly", async () => {
    (prisma.experience.findMany as any).mockResolvedValueOnce([]);

    const req = createMockRequest("http://localhost:3000/api/experiences?difficulty=EASY&categoryId=cat-456");
    await GET(req);
    
    expect(prisma.experience.findMany).toHaveBeenCalledWith({
      where: {
        status: "PUBLISHED",
        difficulty: "EASY",
        categories: { some: { categoryId: "cat-456" } }
      },
      orderBy: { createdAt: "desc" },
      include: {
        categories: { include: { category: true } }
      }
    });
  });

  it("handles database errors properly", async () => {
    (prisma.experience.findMany as any).mockRejectedValueOnce(new Error("DB Error"));

    const req = createMockRequest("http://localhost:3000/api/experiences");
    const res = await GET(req);
    
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Failed to fetch experiences");
  });
});
