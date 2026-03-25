import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  STATUS_COLORS,
  formatDate,
  DashboardNav,
  DashboardLoader,
  DashboardEmptyState,
} from "@/components/dashboard/DashboardShared";

describe("DashboardShared", () => {
  it("exposes expected status color classes", () => {
    expect(STATUS_COLORS.UPCOMING).toContain("bg-blue-500/10");
    expect(STATUS_COLORS.ACTIVE).toContain("bg-green-500/10");
    expect(STATUS_COLORS.TREK_STARTED).toContain("bg-yellow-500/10");
    expect(STATUS_COLORS.TREK_ENDED).toContain("bg-orange-500/10");
    expect(STATUS_COLORS.COMPLETED).toContain("bg-purple-500/10");
  });

  it("formats date for en-IN locale style", () => {
    const value = formatDate("2026-02-15T00:00:00.000Z");
    expect(value).toContain("2026");
  });

  it("renders dashboard nav link", () => {
    render(<DashboardNav />);
    const link = screen.getByRole("link", { name: /back to dashboard/i });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("renders loader and empty state", () => {
    const { container } = render(
      <>
        <DashboardLoader />
        <DashboardEmptyState title="No Trips" description="Nothing assigned yet" />
      </>,
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.getByText("No Trips")).toBeInTheDocument();
    expect(screen.getByText("Nothing assigned yet")).toBeInTheDocument();
  });
});
