import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BookNowButton from "@/components/booking/BookNowButton";
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

describe("BookNowButton", () => {
  const mockPush = vi.fn();

  const props = {
    experienceId: "exp-1",
    experienceTitle: "Kedarkantha Trek",
    experienceSlug: "kedarkantha-trek",
    basePrice: 12999,
    maxCapacity: 12,
    pickupPoints: ["Delhi"],
    dropPoints: ["Delhi"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (useAuth as any).mockReturnValue({ user: null, isLoading: false });
  });

  it("redirects guest users to login on click", () => {
    render(<BookNowButton {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Book Now" }));

    expect(mockPush).toHaveBeenCalledWith("/login?redirect=/experiences/kedarkantha-trek");
    expect(screen.queryByTestId("booking-modal")).not.toBeInTheDocument();
  });

  it("opens booking modal for authenticated users and closes it", () => {
    (useAuth as any).mockReturnValue({
      user: { id: "user-1" },
      isLoading: false,
    });

    render(<BookNowButton {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Book Now" }));

    expect(screen.getByTestId("booking-modal")).toBeInTheDocument();
    expect(screen.getByText("Kedarkantha Trek")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
    expect(screen.queryByTestId("booking-modal")).not.toBeInTheDocument();
  });

  it("shows loading text and disables button while auth is loading", () => {
    (useAuth as any).mockReturnValue({ user: null, isLoading: true });

    render(<BookNowButton {...props} />);

    const button = screen.getByRole("button", { name: "Loading…" });
    expect(button).toBeDisabled();
  });
});
