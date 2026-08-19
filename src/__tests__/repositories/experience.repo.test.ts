import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => {
  const mockPrisma = {
    experience: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
});

import { ExperienceRepo } from "@/repositories/experience.repo";
import { prisma } from "@/lib/db";

const mockCreate = vi.mocked(prisma.experience.create);

describe("ExperienceRepo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new experience including thingsToKeepInMind and default fields", async () => {
    const inputData = {
      title: "Kudremukh Trek",
      description: { text: "Beautiful peak" },
      basePrice: 2500,
      capacity: 20,
      durationDays: 2,
      location: "Chikmagalur",
      coverImage: "https://example.com/cover.jpg",
      thingsToCarry: ["Torch", "Raincoat"],
      thingsToKeepInMind: ["No smoking", "Respect nature"],
    };

    mockCreate.mockResolvedValue({
      id: "exp-1",
      slug: "kudremukh-trek",
      ...inputData,
    } as any);

    const result = await ExperienceRepo.create(inputData as any, "kudremukh-trek");

    expect(result.id).toBe("exp-1");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "kudremukh-trek",
          thingsToCarry: ["Torch", "Raincoat"],
          thingsToKeepInMind: ["No smoking", "Respect nature"],
        }),
      })
    );
  });
});
