import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ExperiencesPage, { metadata } from "@/app/experiences/page";

const { mockExperienceFindMany, mockCategoryFindMany } = vi.hoisted(() => ({
  mockExperienceFindMany: vi.fn(),
  mockCategoryFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    experience: {
      findMany: mockExperienceFindMany,
    },
    category: {
      findMany: mockCategoryFindMany,
    },
    platformSetting: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock("@/app/experiences/ExperiencesClient", () => ({
  default: ({
    initialExperiences,
    categories,
    initialFilter,
  }: {
    initialExperiences: Array<{ title: string; slotsCount: number }>;
    categories: Array<{ name: string }>;
    initialFilter: string;
  }) => (
    <div>
      <p data-testid="filter">{initialFilter}</p>
      <p data-testid="exp-count">{initialExperiences.length}</p>
      <p data-testid="cat-count">{categories.length}</p>
      <p data-testid="first-title">{initialExperiences[0]?.title ?? "none"}</p>
      <p data-testid="first-slots">{initialExperiences[0]?.slotsCount ?? 0}</p>
    </div>
  ),
}));

describe("app/experiences/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports metadata for experiences listing page", () => {
    expect(metadata.title).toBe("Explore Adventures");
    expect(String(metadata.description)).toContain("curated treks");
  });

  it("serializes db results and passes initial filter to client", async () => {
    mockExperienceFindMany.mockResolvedValue([
      {
        id: "e1",
        title: "Hampta Pass",
        slug: "hampta-pass",
        description: "A classic crossover trail",
        durationDays: 5,
        location: "Himachal",
        basePrice: 14999,
        difficulty: "MODERATE",
        status: "PUBLISHED",
        coverImage: null,
        cardImage: null,
        images: ["img1.jpg"],
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-02T00:00:00Z"),
        startDate: null,
        endDate: null,
        slots: [{ id: "s1" }, { id: "s2" }],
        categories: [
          {
            category: {
              id: "c1",
              name: "Trekking",
              slug: "trekking",
            },
          },
        ],
      },
    ]);

    mockCategoryFindMany.mockResolvedValue([
      { id: "c1", name: "Trekking", slug: "trekking" },
      { id: "c2", name: "Camping", slug: "camping" },
    ]);

    const ui = await ExperiencesPage({
      searchParams: Promise.resolve({ category: "trekking" }),
    });
    render(ui);

    expect(screen.getByTestId("filter")).toHaveTextContent("trekking");
    expect(screen.getByTestId("exp-count")).toHaveTextContent("1");
    expect(screen.getByTestId("cat-count")).toHaveTextContent("2");
    expect(screen.getByTestId("first-title")).toHaveTextContent("Hampta Pass");
    expect(screen.getByTestId("first-slots")).toHaveTextContent("2");
  });
});
