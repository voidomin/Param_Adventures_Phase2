import { render, screen } from "@testing-library/react";
import Testimonials from "@/components/home/Testimonials";
import { describe, it, expect, vi } from "vitest";
import React from "react";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    experienceReview: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "rev-1",
          reviewText: "Amazing experience!",
          rating: 5,
          user: { name: "Alice" },
          experience: { title: "Trek A", slug: "trek-a" },
        },
      ]),
    },
  },
}));

// Mock Carousel to avoid complex UI issues
vi.mock("@/components/ui/Carousel", () => ({
  default: ({ children }: any) => <div data-testid="carousel-mock">{children}</div>,
}));

describe("Testimonials", () => {
  it("renders testimonials section", async () => {
    // Since it's an async server component, we render and wait
    const Result = await Testimonials();
    render(Result);
    
    expect(screen.getByText(/What Our Travelers Say/i)).toBeInTheDocument();
    expect(screen.getByText(/Amazing experience!/i)).toBeInTheDocument();
    expect(screen.getByText(/Alice/i)).toBeInTheDocument();
  });
});
