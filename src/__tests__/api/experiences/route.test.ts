import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../../../app/api/experiences/route";
import { prisma } from "../../../lib/db";
import { NextRequest } from "next/server";

vi.mock("../../../lib/db", () => ({
  prisma: {
    experience: {
      findMany: vi.fn(),
    },
  },
}));

describe("GET /api/experiences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a list of experiences", async () => {
    const mockExperiences = [
      { id: "1", title: "Trek 1", slug: "trek-1", location: "Himalayas" },
      { id: "2", title: "Trek 2", slug: "trek-2", location: "Western Ghats" },
    ];
    vi.mocked(prisma.experience.findMany).mockResolvedValue(mockExperiences as unknown);

    const req = new NextRequest("http://localhost/api/experiences");
    const response = await GET(req);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.experiences).toHaveLength(2);
    expect(data.experiences[0].title).toBe("Trek 1");
  });

  it("handles database errors", async () => {
    vi.mocked(prisma.experience.findMany).mockRejectedValue(new Error("DB Error"));
    
    const req = new NextRequest("http://localhost/api/experiences");
    const response = await GET(req);
    
    expect(response.status).toBe(500);
  });
});
