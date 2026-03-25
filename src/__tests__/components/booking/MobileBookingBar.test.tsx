import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MobileBookingBar from "@/components/booking/MobileBookingBar";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";

vi.mock("@/lib/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/components/booking/BookingModal", () => ({
  default: ({ experienceTitle, onClose }: any) => (
    <div data-testid="booking-modal">
      <span>{experienceTitle}</span>
      <button type="button" onClick={onClose}>
        Close modal
      </button>
    </div>
  ),
}));

describe("MobileBookingBar", () => {
  const mockPush = vi.fn();

  const props = {
    experienceId: "exp-2",
    experienceTitle: "Valley of Flowers",
    experienceSlug: "valley-of-flowers",
    basePrice: 12345,
    maxCapacity: 8,
    pickupPoints: ["Rishikesh"],
    dropPoints: ["Rishikesh"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (useAuth as any).mockReturnValue({ user: null, isLoading: false });
  });

  it("renders starting price with formatted amount", () => {
    render(<MobileBookingBar {...props} />);

    expect(screen.getByText("Starting from")).toBeInTheDocument();
    expect(screen.getByText("12,345")).toBeInTheDocument();
  });

  it("redirects guest users to login", () => {
    render(<MobileBookingBar {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Book Now" }));

    expect(mockPush).toHaveBeenCalledWith("/login?redirect=/experiences/valley-of-flowers");
    expect(screen.queryByTestId("booking-modal")).not.toBeInTheDocument();
  });

  it("opens and closes booking modal for authenticated users", () => {
    (useAuth as any).mockReturnValue({
      user: { id: "user-2" },
      isLoading: false,
    });

    render(<MobileBookingBar {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Book Now" }));

    expect(screen.getByTestId("booking-modal")).toBeInTheDocument();
    expect(screen.getByText("Valley of Flowers")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
    expect(screen.queryByTestId("booking-modal")).not.toBeInTheDocument();
  });

  it("shows loading state and disables booking button", () => {
    (useAuth as any).mockReturnValue({ user: null, isLoading: true });

    render(<MobileBookingBar {...props} />);

    const button = screen.getByRole("button", { name: "Loading…" });
    expect(button).toBeDisabled();
  });
});
