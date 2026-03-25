import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    experience: {
      findUnique: vi.fn(),
    },
    slot: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/experiences/[slug]/slots/route";
import { prisma } from "@/lib/db";

const mockExperienceFindUnique = vi.mocked(prisma.experience.findUnique);
const mockSlotFindMany = vi.mocked(prisma.slot.findMany);

describe("GET /api/experiences/[slug]/slots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when experience is not found", async () => {
    mockExperienceFindUnique.mockResolvedValue(null);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ slug: "everest" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Experience not found.");
    expect(mockSlotFindMany).not.toHaveBeenCalled();
  });

  it("returns available future slots ordered by date", async () => {
    mockExperienceFindUnique.mockResolvedValue({ id: "exp-1" } as any);
    mockSlotFindMany.mockResolvedValue([
      { id: "s1", date: new Date("2026-12-01"), capacity: 10, remainingCapacity: 4 },
    ] as any);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ slug: "everest" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.slots).toHaveLength(1);
    expect(mockSlotFindMany).toHaveBeenCalledWith({
      where: {
        experienceId: "exp-1",
        date: { gte: expect.any(Date) },
        remainingCapacity: { gt: 0 },
      },
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        capacity: true,
        remainingCapacity: true,
      },
    });
  });

  it("returns 500 on unexpected error", async () => {
    mockExperienceFindUnique.mockRejectedValue(new Error("db down"));

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ slug: "everest" }),
    });

    expect(response.status).toBe(500);
  });
});
