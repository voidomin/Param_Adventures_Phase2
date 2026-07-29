import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DashboardStatsSkeleton, DashboardListSkeleton, DashboardFormSkeleton } from "@/components/dashboard/DashboardSkeleton";

vi.mock("@/components/ui/Skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton-item" className={className} />
  ),
}));

describe("DashboardStatsSkeleton", () => {
  it("renders a header, 4 stat cards, and 3 list rows", () => {
    const { container } = render(<DashboardStatsSkeleton />);

    expect(screen.getAllByTestId("skeleton-item").length).toBeGreaterThan(0);
    const statCards = container.querySelectorAll(".grid > .bg-card");
    expect(statCards).toHaveLength(4);
  });
});

describe("DashboardListSkeleton", () => {
  it("renders 4 list-row placeholders", () => {
    const { container } = render(<DashboardListSkeleton />);

    expect(screen.getAllByTestId("skeleton-item").length).toBeGreaterThan(0);
    const rows = container.querySelectorAll(".bg-card.border");
    expect(rows).toHaveLength(4);
  });
});

describe("DashboardFormSkeleton", () => {
  it("renders a header and 4 label/input field placeholders", () => {
    const { container } = render(<DashboardFormSkeleton />);

    expect(screen.getAllByTestId("skeleton-item").length).toBeGreaterThan(0);
    const fields = container.querySelectorAll(".bg-card > .space-y-2");
    expect(fields).toHaveLength(4);
  });
});
