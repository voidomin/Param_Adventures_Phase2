import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ExperienceDetailPage from "@/app/experiences/[slug]/page";
import { prisma } from "@/lib/db";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/experiences/test-slug",
}));

vi.mock("@/lib/AuthContext", () => ({
  useAuth: vi.fn().mockReturnValue({ user: null, loading: false }),
}));

// Mock DB
vi.mock("@/lib/db", () => ({
  prisma: {
    experience: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock child components that might complain about missing context or cause JSDOM issues
vi.mock("@/components/experiences/ExperienceReviews", () => ({
  default: () => <div data-testid="mock-reviews">Reviews Component</div>
}));
vi.mock("@/components/booking/BookNowButton", () => ({
  default: () => <div data-testid="mock-book-now">Book Now</div>
}));
vi.mock("@/components/experiences/SaveButton", () => ({
  default: () => <div data-testid="mock-save">Save</div>
}));
vi.mock("@/components/experiences/SimilarTrips", () => ({
  default: () => <div data-testid="mock-similar-trips">Similar Trips</div>
}));
vi.mock("@/components/experiences/ExperienceGallery", () => ({
  default: () => <div data-testid="mock-gallery">Gallery</div>
}));

describe("ExperienceDetailPage", () => {
  it("renders experience details successfully", async () => {
    (prisma.experience.findUnique as any).mockResolvedValueOnce({
      id: "exp-id",
      slug: "test-slug",
      title: "Majestic Mountains Trek",
      description: "A wonderful trek",
      location: "Himalayas",
      durationDays: 7,
      basePrice: 15000,
      capacity: 20,
      status: "PUBLISHED",
      difficulty: "HARD",
      images: ["image1.jpg", "image2.jpg"],
      categories: [{ category: { id: "cat1", name: "Trekking" } }],
      itinerary: [
        { id: 1, title: "Day 1", description: "Arrive", meals: ["Dinner"], accommodation: "Homestay" }
      ],
      inclusions: ["Meals", "Guide"],
      exclusions: ["Flights"],
      faqs: [{ question: "Is it cold?", answer: "Yes." }],
      thingsToCarry: ["Warm jacket", "Boots"],
      cancellationPolicy: "No refunds after 7 days.",
      maxGroupSize: 15,
      minAge: 12,
      networkConnectivity: "Poor",
      fitnessRequirement: "High"
    });

    const jsx = await ExperienceDetailPage({ params: Promise.resolve({ slug: "test-slug" }) });
    render(jsx);

    expect(screen.getAllByText("Majestic Mountains Trek").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Himalayas").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/7 Days/i).length).toBeGreaterThan(0);
    
    // Check if sections rendered
    expect(screen.getByText("Detailed Itinerary")).toBeInTheDocument();
    expect(screen.getByText("What's Included")).toBeInTheDocument();
    expect(screen.getByText("Frequently Asked Questions")).toBeInTheDocument();
    
    // Check mock components
    expect(screen.getByTestId("mock-reviews")).toBeInTheDocument();
    expect(screen.getByTestId("mock-book-now")).toBeInTheDocument();
  });
});
