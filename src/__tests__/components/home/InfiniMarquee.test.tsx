import { render, screen } from "@testing-library/react";
import InfiniMarquee from "@/components/home/InfiniMarquee";
import { describe, it, expect, vi } from "vitest";
import React from "react";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe("InfiniMarquee", () => {
  it("renders correctly with destinations", () => {
    const destinations = ["Nepal", "Bhutan", "India"];
    render(<InfiniMarquee destinations={destinations} />);
    
    // Repeated items should be present
    expect(screen.getAllByText(/Nepal/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Bhutan/i).length).toBeGreaterThanOrEqual(1);
  });

  it("returns null when no destinations", () => {
    const { container } = render(<InfiniMarquee destinations={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
