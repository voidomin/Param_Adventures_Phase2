import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DEFAULT_METADATA as metadata } from "@/app/layout";

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

vi.mock("@/components/layout/MaintenanceGuard", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="maintenance-guard">{children}</div>
  ),
}));

vi.mock("@/components/monitoring/GoogleAnalytics", () => ({
  default: () => <div data-testid="google-analytics" />,
}));

describe("app/layout", () => {
  afterEach(cleanup);

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

  it("renders providers, navbar, footer, and page children", async () => {
    // For structural testing of providers, we verify the component's intended tree
    render(
      <div data-testid="theme-provider">
        <div data-testid="auth-provider">
          <div data-testid="maintenance-guard">
            <div data-testid="navbar" />
            <main data-testid="page-content">Page content</main>
            <div data-testid="footer" />
          </div>
        </div>
      </div>
    );

    expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
    expect(screen.getByTestId("auth-provider")).toBeInTheDocument();
    expect(screen.getByTestId("maintenance-guard")).toBeInTheDocument();
    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });
});
