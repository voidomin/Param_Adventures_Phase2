import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ExperienceStickyNav from "@/components/experiences/ExperienceStickyNav";
import React from "react";

describe("ExperienceStickyNav Smoke Test", () => {
  const sections = [
    { id: "overview", label: "Overview" },
    { id: "itinerary", label: "Itinerary" },
    { id: "location", label: "Location" },
  ];

  beforeEach(() => {
    vi.stubGlobal("window", {
      ...globalThis,
      scrollTo: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    
    // Create elements in body for getElementById
    document.body.innerHTML = sections.map(s => `<div id="${s.id}"></div>`).join('');
    
    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      bottom: 200,
      left: 0,
      right: 0,
      width: 100,
      height: 100,
    } as DOMRect));
  });

  it("renders all section sub-navigation links", () => {
    render(<ExperienceStickyNav sections={sections} />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Itinerary")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
  });

  it("calls window.scrollTo when a link is clicked", () => {
    render(<ExperienceStickyNav sections={sections} />);
    fireEvent.click(screen.getByText("Itinerary"));
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it("returns null when no sections provided", () => {
    const { container } = render(<ExperienceStickyNav sections={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
