import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import SimilarTrips from "@/components/experiences/SimilarTrips";
import { prisma } from "@/lib/db";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    experience: {
      findMany: vi.fn(),
    },
  },
}));

describe("SimilarTrips Smoke Test", () => {
  const mockSimilar = [
    {
      id: "2",
      title: "Similar Hike",
      slug: "similar-hike",
      location: "Mountains",
      durationDays: 2,
      basePrice: 3000,
      images: ["img.jpg"],
    },
  ];

  it("renders similar trips when found", async () => {
    vi.mocked(prisma.experience.findMany).mockResolvedValue(mockSimilar as any);

    // SimilarTrips is an async server component
    const Result = await SimilarTrips({
      currentExperienceId: "1",
      categoryIds: ["cat1"]
    });
    render(Result);

    expect(screen.getByText("You Might Also Like")).toBeInTheDocument();
    expect(screen.getByText("Similar Hike")).toBeInTheDocument();
    expect(screen.getByText("Mountains")).toBeInTheDocument();
  });

  it("returns null when no categories provided", async () => {
    const Result = await SimilarTrips({ 
      currentExperienceId: "1", 
      categoryIds: [] 
    });
    expect(Result).toBeNull();
  });

  it("returns null when no similar trips found", async () => {
    vi.mocked(prisma.experience.findMany).mockResolvedValue([]);
    const Result = await SimilarTrips({ 
      currentExperienceId: "1", 
      categoryIds: ["cat1"] 
    });
    expect(Result).toBeNull();
  });

  it("returns null when Prisma findMany throws an error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.experience.findMany).mockRejectedValue(new Error("Database error"));
    
    const Result = await SimilarTrips({ 
      currentExperienceId: "1", 
      categoryIds: ["cat1"] 
    });
    expect(Result).toBeNull();
  });

  it("excludes the current experience from the Prisma query", async () => {
    vi.mocked(prisma.experience.findMany).mockResolvedValue([]);
    
    await SimilarTrips({ 
      currentExperienceId: "999", 
      categoryIds: ["cat1"] 
    });

    expect(prisma.experience.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: "999" }
        })
      })
    );
  });
});
