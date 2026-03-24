import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

describe("Skeleton", () => {
  it("renders with default classes", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("animate-pulse");
    expect(el.className).toContain("rounded-md");
    expect(el.className).toContain("bg-foreground/10");
  });

  it("merges custom classes", () => {
    const { container } = render(<Skeleton className="w-10 h-10 custom-class" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("custom-class");
    expect(el.className).toContain("w-10");
    expect(el.className).toContain("h-10");
  });

  it("passes additional props", () => {
    const { getByTestId } = render(<Skeleton data-testid="skeleton-test" aria-hidden="true" />);
    const el = getByTestId("skeleton-test");
    expect(el).toHaveAttribute("aria-hidden", "true");
  });
});
