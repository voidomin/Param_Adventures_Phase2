import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import React from "react";

// Mock next-themes
vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="next-themes-provider">{children}</div>
  )
}));

describe("ThemeProvider Component", () => {
  it("renders without crashing", () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <div data-testid="child" />
      </ThemeProvider>
    );
    expect(getByTestId("next-themes-provider")).toBeInTheDocument();
  });

  it("renders children accurately", () => {
    const { getByText } = render(
      <ThemeProvider>
        <p>Current Theme</p>
      </ThemeProvider>
    );
    expect(getByText("Current Theme")).toBeInTheDocument();
  });
});
