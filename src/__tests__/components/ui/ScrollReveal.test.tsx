import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import ScrollReveal from "@/components/ui/ScrollReveal";


// Mock framer-motion since we just want to test component mounting and props
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, "data-testid": testId }: any) => (
      <div className={className} data-testid={testId || "motion-div"}>
        {children}
      </div>
    ),
  },
}));

describe("ScrollReveal", () => {
  it("renders children correctly", () => {
    const { getByText } = render(
      <ScrollReveal>
        <p>Revealed Content</p>
      </ScrollReveal>
    );
    expect(getByText("Revealed Content")).toBeInTheDocument();
  });

  it("applies custom class names", () => {
    const { getByTestId } = render(
      <ScrollReveal className="custom-reveal">
        <p>Test</p>
      </ScrollReveal>
    );
    expect(getByTestId("motion-div").className).toContain("custom-reveal");
  });
});
