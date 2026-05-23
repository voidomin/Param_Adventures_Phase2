import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TableSkeleton } from "@/components/admin/TableSkeleton";

vi.mock("@/components/ui/Skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton-cell" className={className} />
  ),
}));

describe("TableSkeleton", () => {
  it("renders expected number of skeleton cells for provided rows and columns", () => {
    render(<TableSkeleton columns={3} rows={2} />);

    const cells = screen.getAllByTestId("skeleton-cell");
    expect(cells).toHaveLength(9);
  });

  it("uses default rows value when rows prop is omitted", () => {
    render(<TableSkeleton columns={2} />);

    const cells = screen.getAllByTestId("skeleton-cell");
    expect(cells).toHaveLength(12);
  });
});
