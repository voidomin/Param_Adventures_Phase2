import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Hero from "@/components/layout/Hero";
import React from "react";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe("Hero Smoke Test", () => {
  const customSlides = [
    {
      id: "s1",
      title: "Custom Adventure 1",
      subtitle: "Subtitle 1",
      videoUrl: "https://example.com/v1.mp4",
      ctaLink: "/test1",
    },
    {
      id: "s2",
      title: "Custom Adventure 2",
      subtitle: "Subtitle 2",
      videoUrl: "https://example.com/v2.jpg",
      ctaLink: "/test2",
    },
  ];

  it("renders with default fallback slides when none provided", () => {
    render(<Hero />);
    expect(screen.getByText(/Experience the/i)).toBeInTheDocument();
    expect(screen.getByText(/Extraordinary/i)).toBeInTheDocument();
  });

  it("renders custom slides correctly", () => {
    render(<Hero slides={customSlides} />);
    expect(screen.getByText("Custom Adventure 1")).toBeInTheDocument();
    expect(screen.getByText("Subtitle 1")).toBeInTheDocument();
    
    // Check if video is rendered for s1
    expect(document.querySelector("video")).toBeDefined();
  });

  it("navigates between slides", () => {
    render(<Hero slides={customSlides} />);
    
    const nextBtn = document.querySelector(".lucide-chevron-right");
    expect(nextBtn).toBeDefined();
    if (nextBtn?.parentElement) {
      fireEvent.click(nextBtn.parentElement);
    }
    expect(screen.getByText("Custom Adventure 2")).toBeInTheDocument();

    const prevBtn = document.querySelector(".lucide-chevron-left");
    if (prevBtn?.parentElement) {
      fireEvent.click(prevBtn.parentElement);
    }
    expect(screen.getByText("Custom Adventure 1")).toBeInTheDocument();
  });
});
