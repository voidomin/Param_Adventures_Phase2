import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "../../../app/dashboard/page";
import React from "react";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

// Mock fetch
globalThis.fetch = vi.fn();

describe("Dashboard Page", () => {
  it("renders loading state initially", () => {
    (globalThis.fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<DashboardPage />);
    expect(screen.getByText(/loading your dashboard/i)).toBeDefined();
  });

  it("renders error state on fetch failure", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<DashboardPage />);
    const errorMsg = await screen.findByText(/something went wrong/i);
    expect(errorMsg).toBeDefined();
  });
});
