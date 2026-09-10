import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import CompactExperienceCard from "@/components/home/sections/CompactExperienceCard";

const mediaSettings = {
  provider: "CLOUDINARY" as const,
  globalQuality: 90,
  highFidelity: true,
};

const mockExperience = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "e1",
  title: "Kalsubai Night Trek",
  slug: "kalsubai-night-trek",
  durationDays: 1,
  location: "Maharashtra",
  basePrice: 1499,
  difficulty: "EASY" as const,
  cardImage: null,
  coverImage: null,
  images: [] as string[],
  ...overrides,
});

describe("CompactExperienceCard", () => {
  it("renders the core trip details", () => {
    render(<CompactExperienceCard experience={mockExperience() as any} mediaSettings={mediaSettings as any} />);
    expect(screen.getByText("Kalsubai Night Trek")).toBeInTheDocument();
    expect(screen.getByText("Maharashtra")).toBeInTheDocument();
    expect(screen.getByText("1,499")).toBeInTheDocument();
    expect(screen.getByText("EASY")).toBeInTheDocument();
    expect(screen.getByText("Book Now")).toBeInTheDocument();
  });

  it("does not render save/share buttons or an upcoming-dates block", () => {
    render(<CompactExperienceCard experience={mockExperience() as any} mediaSettings={mediaSettings as any} />);
    expect(screen.queryByTestId("save-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("share-button")).not.toBeInTheDocument();
    expect(screen.queryByText(/upcoming dates/i)).not.toBeInTheDocument();
  });

  it("links to the trip's own page", () => {
    render(<CompactExperienceCard experience={mockExperience() as any} mediaSettings={mediaSettings as any} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/experiences/kalsubai-night-trek");
  });

  it("applies dark styling when darkTheme is set", () => {
    render(<CompactExperienceCard experience={mockExperience() as any} mediaSettings={mediaSettings as any} darkTheme />);
    expect(screen.getByRole("link").className).toContain("bg-[#0c0c0c]");
  });
});
