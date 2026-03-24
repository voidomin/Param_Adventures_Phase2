import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import StoryPageClient from "@/components/story/StoryPageClient";
import React from "react";

// Mock framer-motion hooks
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, whileInView, initial, animate, viewport, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  useScroll: () => ({ scrollYProgress: { get: () => 0.5 } }),
  useTransform: () => ({ get: () => "0%" }),
  AnimatePresence: ({ children }: any) => children,
}));

const mockBlocks = [
  {
    id: "b1",
    type: "hero",
    title: "Our Epic Story",
    subtitle: "Testing our story",
    body: null,
    imageUrl: "hero.jpg",
    stat: null,
    order: 0,
  },
  {
    id: "b2",
    type: "milestone",
    title: "First Adventure",
    subtitle: "Year 2020",
    body: "The beginning of everything.",
    imageUrl: "m1.jpg",
    stat: "2020",
    order: 1,
  },
  {
    id: "b3",
    type: "value",
    title: "Excellence",
    subtitle: "Doing our best",
    body: null,
    imageUrl: null,
    stat: "⭐",
    order: 2,
  },
  {
    id: "b4",
    type: "cta",
    title: "Join Us",
    subtitle: "Ready for more?",
    body: null,
    imageUrl: null,
    stat: null,
    order: 3,
  },
];

describe("StoryPageClient Smoke Test", () => {
  it("renders all major sections based on blocks", () => {
    render(<StoryPageClient blocks={mockBlocks} />);
    
    // Hero
    expect(screen.getByText("Our Epic Story")).toBeInTheDocument();
    
    // Milestones
    expect(screen.getByText("First Adventure")).toBeInTheDocument();
    expect(screen.getByText("The beginning of everything.")).toBeInTheDocument();
    expect(screen.getByText("Year 2020")).toBeInTheDocument();
    
    // Values
    expect(screen.getByText("Excellence")).toBeInTheDocument();
    expect(screen.getByText("Doing our best")).toBeInTheDocument();
    
    // CTA
    expect(screen.getByText("Join Us")).toBeInTheDocument();
    expect(screen.getByText("Explore Adventures")).toBeInTheDocument();
  });

  it("renders empty state correctly", () => {
    const { container } = render(<StoryPageClient blocks={[]} />);
    expect(container.firstChild).toBeDefined();
    // It should just be a div with background glows but no content
    expect(screen.queryByText("Our Story")).toBeNull();
  });
});
