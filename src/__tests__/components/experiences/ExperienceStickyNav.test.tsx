import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
    vi.clearAllMocks();
    vi.spyOn(globalThis, "scrollTo").mockImplementation(() => {});
    vi.spyOn(globalThis, "addEventListener");
    vi.spyOn(globalThis, "removeEventListener");
    
    // Create elements in body for getElementById
    document.body.innerHTML = sections.map(s => `<div id="${s.id}"></div>`).join('');
    
    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      top: 500, // Not active (> 150)
      bottom: 600,
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

  it("calls globalThis.scrollTo when a link is clicked", () => {
    render(<ExperienceStickyNav sections={sections} />);
    fireEvent.click(screen.getByText("Itinerary"));
    expect(globalThis.scrollTo).toHaveBeenCalled();
  });

  it("returns null when no sections provided", () => {
    const { container } = render(<ExperienceStickyNav sections={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("updates active section on scroll", async () => {
    render(<ExperienceStickyNav sections={sections} />);
    
    // Initial active section is sections[0].id
    expect(screen.getByText("Overview")).toHaveClass("bg-primary");

    // Mock getElementById for each section to return elements with different bounded rects
    const mockElements: Record<string, any> = {
      overview: { getBoundingClientRect: () => ({ top: -200 }) },
      itinerary: { getBoundingClientRect: () => ({ top: 100 }) }, // Active (<= 150)
      location: { getBoundingClientRect: () => ({ top: 300 }) },
    };

    vi.spyOn(document, "getElementById").mockImplementation((id) => mockElements[id]);

    fireEvent.scroll(globalThis as unknown as Window);

    await waitFor(() => {
      expect(screen.getByText("Itinerary")).toHaveClass("bg-primary");
      expect(screen.getByText("Overview")).not.toHaveClass("bg-primary");
    });
  });

  it("removes event listener on unmount", () => {
    const { unmount } = render(<ExperienceStickyNav sections={sections} />);
    unmount();
    expect(window.removeEventListener).toHaveBeenCalledWith("scroll", expect.any(Function));
  });

  it("does not crash when clicking a link for a missing element", () => {
    const sectionsWithMissing = [{ id: "non-existent", label: "Missing" }];
    render(<ExperienceStickyNav sections={sectionsWithMissing} />);
    
    // Should not throw and should not call scrollTo
    fireEvent.click(screen.getByText("Missing"));
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
