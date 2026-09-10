import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import HomepageSectionRenderer from "@/components/home/sections/HomepageSectionRenderer";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));
vi.mock("@/components/experiences/SaveButton", () => ({
  default: () => <button data-testid="save-button">Save</button>,
}));
vi.mock("@/components/ui/ShareButton", () => ({
  default: () => <button data-testid="share-button">Share</button>,
}));

const mediaSettings = {
  provider: "CLOUDINARY" as const,
  globalQuality: 90,
  highFidelity: true,
};

const mockExperience = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "e1",
  title: "Kalsubai Night Trek",
  slug: "kalsubai-night-trek",
  description: "",
  durationDays: 2,
  location: "Maharashtra",
  basePrice: 1499,
  capacity: 20,
  difficulty: "EASY" as const,
  images: ["https://example.com/img.jpg"],
  categories: [],
  maxAltitude: "1,646m",
  ...overrides,
});

const mockSection = (layout: string, experiences: ReturnType<typeof mockExperience>[]) => ({
  id: `sec-${layout}`,
  layout,
  name: "Section Name",
  heading: "Section Heading",
  subheading: "Section subheading",
  displayOrder: 1,
  isActive: true,
  experiences,
});

describe("HomepageSectionRenderer", () => {
  it("renders MOSAIC_GRID with each assigned experience", () => {
    const section = mockSection("MOSAIC_GRID", [mockExperience({ id: "e1", title: "Trek One" }), mockExperience({ id: "e2", title: "Trek Two" })]);
    render(<HomepageSectionRenderer section={section as any} mediaSettings={mediaSettings as any} />);
    expect(screen.getByText("Section Heading")).toBeInTheDocument();
    expect(screen.getByText("Trek One")).toBeInTheDocument();
    expect(screen.getByText("Trek Two")).toBeInTheDocument();
  });

  it("renders PILGRIMAGE_TRAIL with numbered stops", () => {
    const section = mockSection("PILGRIMAGE_TRAIL", [mockExperience({ id: "e1" })]);
    render(<HomepageSectionRenderer section={section as any} mediaSettings={mediaSettings as any} />);
    expect(screen.getByText("Stop 01")).toBeInTheDocument();
  });

  it("renders ALTITUDE_TICKER with the maxAltitude badge when present", () => {
    const section = mockSection("ALTITUDE_TICKER", [mockExperience({ id: "e1", maxAltitude: "6,153m" })]);
    render(<HomepageSectionRenderer section={section as any} mediaSettings={mediaSettings as any} />);
    expect(screen.getByText("6,153m")).toBeInTheDocument();
  });

  it("renders SPOTLIGHT_MANIFEST with a hero and a manifest list", () => {
    const section = mockSection("SPOTLIGHT_MANIFEST", [
      mockExperience({ id: "hero", title: "Everest Base Camp" }),
      mockExperience({ id: "m1", title: "Annapurna Circuit" }),
    ]);
    render(<HomepageSectionRenderer section={section as any} mediaSettings={mediaSettings as any} />);
    expect(screen.getByText("Everest Base Camp")).toBeInTheDocument();
    expect(screen.getByText("Annapurna Circuit")).toBeInTheDocument();
  });

  it("renders nothing for SPOTLIGHT_MANIFEST when there are zero experiences", () => {
    const section = mockSection("SPOTLIGHT_MANIFEST", []);
    const { container } = render(<HomepageSectionRenderer section={section as any} mediaSettings={mediaSettings as any} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders SPEC_PANELS with the real (non-invented) spec fields", () => {
    const section = mockSection("SPEC_PANELS", [mockExperience({ id: "e1", location: "Kerala", durationDays: 5 })]);
    render(<HomepageSectionRenderer section={section as any} mediaSettings={mediaSettings as any} />);
    expect(screen.getByText("Kerala")).toBeInTheDocument();
    expect(screen.getByText("5D / 4N")).toBeInTheDocument();
  });
});
