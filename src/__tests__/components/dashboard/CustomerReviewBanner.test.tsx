import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CustomerReviewBanner } from "@/components/dashboard/CustomerReviewBanner";

describe("CustomerReviewBanner Component", () => {
  const sampleBookings = [
    {
      id: "booking-1",
      experience: {
        title: "Kudremukh Trek",
        slug: "kudremukh-trek",
      },
      slot: {
        date: "2026-08-10T00:00:00.000Z",
      },
    },
  ];

  it("renders null when eligibleBookings is empty or null", () => {
    const { container: emptyContainer } = render(
      <CustomerReviewBanner eligibleBookings={[]} />
    );
    expect(emptyContainer.firstChild).toBeNull();
  });

  it("renders review prompt with experience title when eligible bookings exist", () => {
    render(<CustomerReviewBanner eligibleBookings={sampleBookings} />);

    expect(screen.getByText(/How was your trip to Kudremukh Trek\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Write a Review/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Write a Review/i });
    expect(link).toHaveAttribute("href", "/experiences/kudremukh-trek#reviews");
  });

  it("hides the banner when dismiss button is clicked", () => {
    render(<CustomerReviewBanner eligibleBookings={sampleBookings} />);

    expect(screen.getByText(/How was your trip to Kudremukh Trek\?/i)).toBeInTheDocument();
    const dismissBtn = screen.getByTitle(/Dismiss notification/i);
    fireEvent.click(dismissBtn);

    expect(screen.queryByText(/How was your trip to Kudremukh Trek\?/i)).not.toBeInTheDocument();
  });
});
