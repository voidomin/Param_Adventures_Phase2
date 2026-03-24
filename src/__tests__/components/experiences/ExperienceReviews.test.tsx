import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ExperienceReviews from "@/components/experiences/ExperienceReviews";
import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";

const mockRouter = {
  push: vi.fn(),
};

const DEFAULT_STATS = { averageRating: 0, totalReviews: 0, breakdown: {} };
const DEFAULT_MY_REVIEW = { canReview: true, review: null };

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => "/experiences/test-trek",
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.setConfig({ testTimeout: 30000 });

describe("ExperienceReviews Smoke Test", () => {
  const slug = "test-trek";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSuccessfulFetch = (
    reviews?: any[], 
    stats?: any, 
    myReview?: any, 
    featured?: any
  ) => {
    const finalReviews = reviews ?? [];
    const finalStats = stats ?? DEFAULT_STATS;
    const finalMyReview = myReview ?? DEFAULT_MY_REVIEW;
    const finalFeatured = featured ?? null;

    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/reviews/my-review")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(finalMyReview),
        });
      }
      if (url.includes("/reviews?limit=50")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            reviews: finalReviews,
            stats: {
              averageRating: finalStats.averageRating ?? 0,
              totalReviews: finalStats.totalReviews ?? 0,
              breakdown: finalStats.breakdown ?? {},
            },
            featuredReview: finalFeatured,
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  };

  it("renders loading state initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // Never resolves
    render(<ExperienceReviews slug={slug} />);
    // Check for anim-pulse or loader
    const loaders = document.getElementsByClassName("animate-spin");
    expect(loaders.length).toBeGreaterThan(0);
  });

  it("renders empty state correctly", async () => {
    mockSuccessfulFetch();
    render(<ExperienceReviews slug={slug} />);
    await waitFor(() => {
      expect(screen.getByText("No reviews yet — be the first to share your experience!")).toBeInTheDocument();
      expect(screen.getByText("No reviews yet for this experience.")).toBeInTheDocument();
    });
  });

  it("displays guest state for unauthenticated users", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/my-review")) {
        return Promise.resolve({ ok: false, status: 401 });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ reviews: [] }) });
    });

    render(<ExperienceReviews slug={slug} />);
    await waitFor(() => {
      const loginBtn = screen.getByText(/Log in to Review/i);
      expect(loginBtn).toBeInTheDocument();
      fireEvent.click(loginBtn);
      expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining("/login"));
    });
  });

  it("displays lock state for ineligible users", async () => {
    mockSuccessfulFetch([], { averageRating: 0, totalReviews: 0, breakdown: {} }, { canReview: false, review: null });
    render(<ExperienceReviews slug={slug} />);
    await waitFor(() => {
      expect(screen.getByText(/Review after your trip/i)).toBeInTheDocument();
    });
  });

  it("handles writing and submitting a new review", async () => {
    mockSuccessfulFetch();
    render(<ExperienceReviews slug={slug} />);

    await waitFor(() => expect(screen.getByText(/Write a Review/i)).toBeInTheDocument());
    
    // Open Modal
    fireEvent.click(screen.getByText(/Write a Review/i));
    
    // Change Rating
    const stars = screen.getAllByRole("button", { name: /Rate \d stars?/i });
    fireEvent.click(stars[3]); // 4 stars

    // Fill Review Text
    const textarea = screen.getByPlaceholderText(/Tell us about the guides/i);
    fireEvent.change(textarea, { target: { value: "This was a fantastic trek!" } });

    // Submit
    mockFetch.mockImplementation((url) => {
      if (url.includes("/reviews") && !url.includes("?")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ reviews: [] }) });
    });

    fireEvent.click(screen.getByText(/Submit Review/i));

    await waitFor(() => {
      expect(screen.getByText(/Review submitted/i)).toBeInTheDocument();
    });
  });

  it("handles editing an existing review", async () => {
    const existingReview = { id: "r1", rating: 5, reviewText: "Original review" };
    mockSuccessfulFetch([], { averageRating: 5, totalReviews: 1, breakdown: { 5: 1 } }, { canReview: true, review: existingReview });
    
    render(<ExperienceReviews slug={slug} />);
    
    await waitFor(() => expect(screen.getByText(/Edit Your Review/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Edit Your Review/i));
    
    const textarea = screen.getByPlaceholderText(/Tell us about the guides/i);
    expect(textarea).toHaveValue("Original review");
    
    fireEvent.change(textarea, { target: { value: "Updated review text" } });
    fireEvent.click(screen.getByText(/Update Review/i));
    
    await waitFor(() => {
      expect(screen.getByText(/Review updated/i)).toBeInTheDocument();
    });
  });

  it("displays stats and featured review", async () => {
    const reviews = [
      { id: "1", rating: 5, reviewText: "Great!", createdAt: new Date().toISOString(), user: { name: "Alice" } }
    ];
    const stats = { averageRating: 5, totalReviews: 1, breakdown: { 5: 1 } };
    const featured = { id: "f1", rating: 5, reviewText: "Featured!", user: { name: "Bob" } };

    mockSuccessfulFetch(reviews, stats, { canReview: true, review: null }, featured);
    
    render(<ExperienceReviews slug={slug} />);
    
    await waitFor(() => {
      expect(screen.getByText("5.0")).toBeInTheDocument();
      expect(screen.getByText(/Featured!/i)).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });
  });

  it("handles submission errors", async () => {
    mockSuccessfulFetch();
    render(<ExperienceReviews slug={slug} />);
    
    await waitFor(() => fireEvent.click(screen.getByText(/Write a Review/i)));
    
    fireEvent.change(screen.getByPlaceholderText(/Tell us about the guides/i), { target: { value: "Too short" } });
    const submitBtn = screen.getByText(/Submit Review/i);
    expect(submitBtn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/Tell us about the guides/i), { target: { value: "Long enough review text" } });
    
    mockFetch.mockImplementation((url) => {
      if (url.includes("/reviews") && !url.includes("?")) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "Server error" }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ reviews: [] }) });
    });

    fireEvent.click(screen.getByText(/Submit Review/i));
    
    await waitFor(() => {
      expect(screen.getByText(/Server error/i)).toBeInTheDocument();
    });
  });
});
