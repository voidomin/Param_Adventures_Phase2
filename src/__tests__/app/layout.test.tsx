import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RootLayout, { metadata } from "@/app/layout";

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "font-inter" }),
  Outfit: () => ({ variable: "font-outfit" }),
}));

vi.mock("@/components/layout/Navbar", () => ({
  default: () => <div data-testid="navbar" />,
}));

vi.mock("@/components/layout/Footer", () => ({
  default: () => <div data-testid="footer" />,
}));

vi.mock("@/components/layout/ThemeProvider", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

vi.mock("@/lib/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}));

describe("app/layout", () => {
  it("exports SEO metadata with expected defaults", () => {
    expect(metadata.title).toEqual(
      expect.objectContaining({
        default: expect.stringContaining("Param Adventures"),
        template: "%s | Param Adventures",
      }),
    );
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.openGraph).toEqual(
      expect.objectContaining({ siteName: "Param Adventures", type: "website" }),
    );
  });

  it("renders providers, navbar, footer, and page children", () => {
    render(
      <RootLayout>
        <div>Page content</div>
      </RootLayout>,
    );

    expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
    expect(screen.getByTestId("auth-provider")).toBeInTheDocument();
    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });
});
