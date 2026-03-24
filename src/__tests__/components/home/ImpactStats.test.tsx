import { render, screen } from "@testing-library/react";
import ImpactStats from "@/components/home/ImpactStats";
import { describe, it, expect, vi } from "vitest";
import React from "react";

// Mock framer-motion to avoid animation issues in JSDOM
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  useInView: () => true,
  useSpring: () => ({ set: vi.fn() }),
  useTransform: () => "1,000",
}));

describe("ImpactStats", () => {
  const mockData = {
    adventurers: 5000,
    routes: 50,
    kmTrekked: 10000,
    rating: 4.9,
  };

  it("renders statistics correctly", () => {
    render(<ImpactStats dynamicData={mockData} />);
    expect(screen.getByText(/Happy Adventurers/i)).toBeInTheDocument();
    expect(screen.getByText(/Unique Routes/i)).toBeInTheDocument();
  });
});
