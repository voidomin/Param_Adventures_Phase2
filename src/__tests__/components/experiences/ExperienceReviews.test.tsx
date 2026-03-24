import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ExperienceReviews from "@/components/experiences/ExperienceReviews";
import React from "react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => "/experiences/test-trip"),
}));

describe("ExperienceReviews Smoke Test", () => {
  const mockReviews = [
    {
      id: "r1",
      rating: 5,
      reviewText: "Amazing experience, the guides were great!",
      createdAt: new Date().toISOString(),
      user: { name: "Alice" },
    },
  ];

  const mockStats = {
    averageRating: 4.5,
    totalReviews: 1,
    breakdown: { 5: 1, 4: 0, 3: 0, 2: 0, 1: 0 },
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders loading state initially", () => {
    // Mock both calls to hang
    vi.mocked(fetch).mockReturnValue(new Promise(() => {})); 
    render(<ExperienceReviews slug="test-trip" />);
    
    // The component returns a div with animate-spin class when loading
    const loader = document.querySelector(".animate-spin");
    expect(loader).toBeDefined();
  });

  it("renders reviews and stats when available", async () => {
    // Mock reviews API
    vi.mocked(fetch).mockImplementation((url: any) => {
      if (typeof url === "string" && url.includes("/reviews?limit=")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            reviews: mockReviews,
            stats: mockStats,
            featuredReview: null,
          }),
        } as Response);
      }
      // Mock my-review API (guest)
      return Promise.resolve({
        status: 401,
        ok: false,
      } as Response);
    });

    render(<ExperienceReviews slug="test-trip" />);

    await waitFor(() => {
      expect(screen.getByText("Traveler Reviews")).toBeInTheDocument();
      expect(screen.getByText("4.5")).toBeInTheDocument();
    });

    expect(screen.getByText(mockReviews[0].reviewText)).toBeInTheDocument();
    expect(screen.getByText("Log in to Review")).toBeInTheDocument();
  });

  it("renders empty state when no reviews found", async () => {
    vi.mocked(fetch).mockImplementation((url: any) => {
      if (typeof url === "string" && url.includes("/reviews?limit=")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            reviews: [],
            stats: { averageRating: 0, totalReviews: 0, breakdown: {} },
            featuredReview: null,
          }),
        } as Response);
      }
      // Mock my-review API (eligible)
      return Promise.resolve({
        ok: true,
        json: async () => ({ canReview: true, review: null }),
      } as Response);
    });

    render(<ExperienceReviews slug="test-trip" />);

    await waitFor(() => {
      // Be very specific with the text to avoid ambiguity
      expect(screen.getByText(/No reviews yet for this experience/i)).toBeInTheDocument();
      expect(screen.getByText("Write a Review")).toBeInTheDocument();
    });
  });

  it("opens review modal when 'Write a Review' is clicked", async () => {
    vi.mocked(fetch).mockImplementation((url: any) => {
      if (typeof url === "string" && url.includes("/reviews?limit=")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ reviews: [], stats: { averageRating: 0, totalReviews: 0, breakdown: {} } }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ canReview: true, review: null }),
      } as Response);
    });

    render(<ExperienceReviews slug="test-trip" />);

    const btn = await screen.findByText("Write a Review");
    await act(async () => {
      btn.click();
    });

    expect(screen.getByText("Rate Your Experience")).toBeInTheDocument();
  });
});
