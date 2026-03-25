import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ExperienceSkeleton } from "@/components/admin/ExperienceSkeleton";

vi.mock("@/components/ui/Skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton-item" className={className} />
  ),
}));

describe("ExperienceSkeleton", () => {
  it("renders three skeleton cards with expected placeholder count", () => {
    const { container } = render(<ExperienceSkeleton />);

    const placeholders = screen.getAllByTestId("skeleton-item");
    expect(placeholders).toHaveLength(30);

    const cards = container.querySelectorAll(".bg-card.border");
    expect(cards).toHaveLength(3);
  });
});
