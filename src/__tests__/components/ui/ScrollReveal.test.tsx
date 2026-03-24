import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import ScrollReveal from "@/components/ui/ScrollReveal";
import React from "react";

// Minimal mock for framer-motion to simplify IntersectionObserver interactions
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("framer-motion");
  return {
    ...actual as any,
    motion: {
      div: ({ children, initial, whileInView, className, ...props }: any) => {
        // Render a static div and pass initial as data-attributes so we can verify the logic
        return (
          <div 
            className={className} 
            data-initial={JSON.stringify(initial)}
            data-testid="motion-div"
          >
            {children}
          </div>
        );
      }
    }
  };
});

describe("ScrollReveal Component", () => {
  it("renders children correctly", () => {
    const { getByText } = render(
      <ScrollReveal>
        <span>Content inside</span>
      </ScrollReveal>
    );
    expect(getByText("Content inside")).toBeInTheDocument();
  });

  it("applies correct initial state for direction 'up'", () => {
    const { getByTestId } = render(<ScrollReveal direction="up">Content</ScrollReveal>);
    const motionDiv = getByTestId("motion-div");
    const initial = JSON.parse(motionDiv.getAttribute("data-initial") || "{}");
    expect(initial).toEqual({ opacity: 0, y: 40 });
  });

  it("applies correct initial state for variant 'blur'", () => {
    const { getByTestId } = render(<ScrollReveal direction="left" variant="blur">Content</ScrollReveal>);
    const motionDiv = getByTestId("motion-div");
    const initial = JSON.parse(motionDiv.getAttribute("data-initial") || "{}");
    expect(initial.x).toBe(40);
    expect(initial.filter).toBe("blur(12px)");
  });

  it("applies correct initial state for variant 'zoom'", () => {
    const { getByTestId } = render(<ScrollReveal direction="down" variant="zoom">Content</ScrollReveal>);
    const motionDiv = getByTestId("motion-div");
    const initial = JSON.parse(motionDiv.getAttribute("data-initial") || "{}");
    expect(initial.y).toBe(-40);
    expect(initial.scale).toBe(0.95);
  });
});
