import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ExperienceReviews from "@/components/experiences/ExperienceReviews";


describe("ExperienceReviews", () => {

  it("renders reviews and stats when available", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/my-review")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ canReview: true, review: null }),
        });
      }
      if (url.includes("/reviews")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            reviews: [
              { id: "1", rating: 5, reviewText: "Amazing trip!", createdAt: "2024-01-01", user: { name: "Alice" } }
            ],
            stats: { averageRating: 5, totalReviews: 1, breakdown: { 5: 1 } },
            featuredReview: null
          }),
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    await act(async () => {
      render(<ExperienceReviews slug="test-slug" />);
    });

    // Check loading goes away and stats appear
    expect(screen.getByText("Amazing trip!")).toBeInTheDocument();
    expect(screen.getByText("Traveler Reviews")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Write a Review")).toBeInTheDocument();
  });
});
