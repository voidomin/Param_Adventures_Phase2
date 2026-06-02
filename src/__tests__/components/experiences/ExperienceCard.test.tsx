import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ExperienceCard from "@/components/experiences/ExperienceCard";
import React from "react";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock sub-components to keep test isolated and fast
vi.mock("@/components/experiences/SaveButton", () => ({
  default: () => <button data-testid="save-button">Save</button>,
}));
vi.mock("@/components/ui/ShareButton", () => ({
  default: () => <button data-testid="share-button">Share</button>,
}));

const mockExperience = {
  id: "1",
  title: "Test Trek",
  slug: "test-trek",
  description: "Description text",
  durationDays: 3,
  location: "Himalayas",
  basePrice: 5000,
  capacity: 10,
  difficulty: "MODERATE" as const,
  images: ["https://example.com/img.jpg"],
  categories: [
    { category: { id: "cat1", name: "Adventure", slug: "adventure" } }
  ],
};

describe("ExperienceCard Smoke Test", () => {
  it("renders basic experience details correctly", () => {
    render(<ExperienceCard experience={mockExperience} />);
    
    expect(screen.getByText("Test Trek")).toBeInTheDocument();
    expect(screen.getByText("Himalayas")).toBeInTheDocument();
    expect(screen.getByText("3D / 2N")).toBeInTheDocument();
    expect(screen.getByText("5,000")).toBeInTheDocument();
    expect(screen.getByText("Adventure")).toBeInTheDocument();
    expect(screen.getByText("MODERATE")).toBeInTheDocument();
  });

  it("renders video when cardImage is an mp4", () => {
    const videoExperience = { ...mockExperience, cardImage: "test.mp4" };
    render(<ExperienceCard experience={videoExperience} />);
    expect(document.querySelector("video")).toBeDefined();
  });

  it("displays sub-components", () => {
    render(<ExperienceCard experience={mockExperience} />);
    expect(screen.getByTestId("save-button")).toBeInTheDocument();
    expect(screen.getByTestId("share-button")).toBeInTheDocument();
  });

  it("handles upcoming slot with remaining capacity correctly", () => {
    const slotExperience = {
      ...mockExperience,
      nextDepartureSlot: {
        date: "2026-06-15T00:00:00.000Z",
        capacity: 10,
        remainingCapacity: 6,
      },
    };
    render(<ExperienceCard experience={slotExperience} />);
    expect(screen.getByText(/15 Jun/)).toBeInTheDocument();
    expect(screen.getByText(/6 left/)).toBeInTheDocument();
  });

  it("handles sold out slot correctly", () => {
    const soldOutExperience = {
      ...mockExperience,
      nextDepartureSlot: {
        date: "2026-06-15T00:00:00.000Z",
        capacity: 10,
        remainingCapacity: 0,
      },
    };
    render(<ExperienceCard experience={soldOutExperience} />);
    expect(screen.getByText(/15 Jun/)).toBeInTheDocument();
    expect(screen.getByText(/Sold Out/)).toBeInTheDocument();
  });

  it("handles no slots scheduled correctly", () => {
    const noSlotsExperience = {
      ...mockExperience,
      nextDepartureSlot: null,
    };
    render(<ExperienceCard experience={noSlotsExperience} />);
    expect(screen.getByText(/No upcoming dates scheduled/)).toBeInTheDocument();
  });
});
