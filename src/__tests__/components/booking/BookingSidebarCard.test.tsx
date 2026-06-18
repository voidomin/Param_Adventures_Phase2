import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BookingSidebarCard from "@/components/booking/BookingSidebarCard";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";

vi.mock("@/lib/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/components/booking/BookingModal", () => ({
  default: ({ experienceTitle, onClose, initialSelectedSlotId }: any) => (
    <div data-testid="booking-modal">
      <span>{experienceTitle}</span>
      <span data-testid="selected-slot-id">{initialSelectedSlotId}</span>
      <button type="button" onClick={onClose}>
        Close modal
      </button>
    </div>
  ),
}));

vi.mock("@/components/experiences/DownloadItineraryBtn", () => ({
  default: () => <div data-testid="download-btn">Download Itinerary Mock</div>,
}));

describe("BookingSidebarCard", () => {
  const mockPush = vi.fn();

  const props = {
    experienceId: "exp-1",
    experienceTitle: "Dudhsagar Waterfall",
    experienceSlug: "dudhsagar-waterfall",
    basePrice: 2499,
    maxCapacity: 15,
    pickupPoints: ["Madgaon"],
    dropPoints: ["Madgaon"],
    slots: [
      { id: "slot-1", date: "2026-07-12T00:00:00.000Z", status: "AVAILABLE", remainingCapacity: 10 },
      { id: "slot-2", date: "2026-07-20T00:00:00.000Z", status: "AVAILABLE", remainingCapacity: 5 },
      { id: "slot-3", date: "2026-08-05T00:00:00.000Z", status: "AVAILABLE", remainingCapacity: 0 }, // Sold Out
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (useAuth as any).mockReturnValue({ user: null, isLoading: false });
  });

  it("renders correctly with available slots and initial disabled button state", () => {
    render(<BookingSidebarCard {...props} />);

    expect(screen.getByText("Reserve Your Spot")).toBeInTheDocument();
    expect(screen.getByText("Select a Date to Book")).toBeDisabled();
    expect(screen.getByTestId("download-btn")).toBeInTheDocument();

    // Verify month filter tabs
    expect(screen.getByRole("button", { name: "All Months" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jul 2026" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aug 2026" })).toBeInTheDocument();
  });

  it("filters slots when a month tab is selected", () => {
    render(<BookingSidebarCard {...props} />);

    // By default, all slots are rendered (2 available + 1 sold out)
    // We format the date string, which for slot-1 matches "12 Jul"
    expect(screen.getByText(/12 Jul/)).toBeInTheDocument();
    expect(screen.getByText(/20 Jul/)).toBeInTheDocument();
    expect(screen.getByText(/5 Aug/)).toBeInTheDocument();

    // Select July filter
    fireEvent.click(screen.getByRole("button", { name: "Jul 2026" }));

    expect(screen.getByText(/12 Jul/)).toBeInTheDocument();
    expect(screen.getByText(/20 Jul/)).toBeInTheDocument();
    expect(screen.queryByText(/5 Aug/)).not.toBeInTheDocument();
  });

  it("enables Book Now button when slot is clicked and redirects guest to login", () => {
    render(<BookingSidebarCard {...props} />);

    // Button is initially disabled
    expect(screen.getByRole("button", { name: "Select a Date to Book" })).toBeInTheDocument();

    // Select first slot
    fireEvent.click(screen.getByText(/12 Jul/));

    // Button should now read "Book Now"
    const bookBtn = screen.getByRole("button", { name: "Book Now" });
    expect(bookBtn).toBeEnabled();

    // Click Book Now as guest
    fireEvent.click(bookBtn);

    expect(mockPush).toHaveBeenCalledWith("/login?redirect=/experiences/dudhsagar-waterfall");
    expect(screen.queryByTestId("booking-modal")).not.toBeInTheDocument();
  });

  it("opens booking modal with pre-selected slot for authenticated users", () => {
    (useAuth as any).mockReturnValue({
      user: { id: "user-1" },
      isLoading: false,
    });

    render(<BookingSidebarCard {...props} />);

    // Select slot-2 (20 Jul)
    fireEvent.click(screen.getByText(/20 Jul/));

    // Click Book Now
    fireEvent.click(screen.getByRole("button", { name: "Book Now" }));

    expect(screen.getByTestId("booking-modal")).toBeInTheDocument();
    expect(screen.getByTestId("selected-slot-id")).toHaveTextContent("slot-2");
  });
});
