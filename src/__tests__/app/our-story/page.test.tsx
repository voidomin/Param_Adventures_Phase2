import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import OurStoryPage, { metadata } from "@/app/our-story/page";

const { mockFindMany } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    storyBlock: {
      findMany: mockFindMany,
    },
  },
}));

vi.mock("@/components/story/StoryPageClient", () => ({
  default: ({ blocks }: { blocks: Array<{ id: string; title: string }> }) => (
    <div>
      <p data-testid="block-count">{blocks.length}</p>
      <p data-testid="first-block-title">{blocks[0]?.title ?? "none"}</p>
    </div>
  ),
}));

describe("app/our-story/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports metadata for our story page", () => {
    expect(metadata.title).toBe("Our Story");
    expect(String(metadata.description)).toContain(
      "journey behind Param Adventures",
    );
  });

  it("uses fallback blocks when database has no active story blocks", async () => {
    mockFindMany.mockResolvedValue([]);

    const ui = await OurStoryPage();
    render(ui);

    expect(screen.getByTestId("block-count")).toHaveTextContent("7");
    expect(screen.getByTestId("first-block-title")).toHaveTextContent(
      "Born from the Mountains",
    );
  });

  it("renders database blocks when active blocks are available", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "b1",
        title: "DB Hero",
        subtitle: "db",
        type: "hero",
        body: null,
        imageUrl: null,
        stat: null,
        order: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const ui = await OurStoryPage();
    render(ui);

    expect(screen.getByTestId("block-count")).toHaveTextContent("1");
    expect(screen.getByTestId("first-block-title")).toHaveTextContent(
      "DB Hero",
    );
  });
});
