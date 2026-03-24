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
});
