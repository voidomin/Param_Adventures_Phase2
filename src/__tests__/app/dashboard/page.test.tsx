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
  it("renders a loading skeleton initially", () => {
    (globalThis.fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves

    const { container } = render(<DashboardPage />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
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

  it("renders dashboard content and CustomerReviewBanner when user has eligible review bookings", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          id: "u1",
          name: "Alex Smith",
          email: "alex@example.com",
          roleName: "REGISTERED_USER",
          createdAt: "2026-01-01",
        },
        upcomingBookings: [],
        pastBookings: [],
        eligibleReviewBookings: [
          {
            id: "b1",
            experience: { title: "Kudremukh Trek", slug: "kudremukh-trek" },
            slot: { date: "2026-08-10" },
          },
        ],
        stats: { total: 1, upcoming: 0, past: 1 },
      }),
    });

    render(<DashboardPage />);
    const reviewPrompt = await screen.findByText(/How was your trip to Kudremukh Trek\?/i);
    expect(reviewPrompt).toBeInTheDocument();
  });
});
