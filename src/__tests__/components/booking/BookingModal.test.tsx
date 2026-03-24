import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BookingModal from "@/components/booking/BookingModal";
import React from "react";

// Mock useRouter
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
}));

vi.setConfig({ testTimeout: 30000 });

// Mock AuthContext
const mockUser = {
  id: "user-1",
  name: "John Doe",
  email: "john@example.com",
  phoneNumber: "919999999999",
  gender: "MALE",
  age: 30,
};

const mockUseAuth = vi.fn();
vi.mock("@/lib/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Set default value for mockUseAuth
mockUseAuth.mockReturnValue({
  user: mockUser,
});

// Mock Razorpay
const mockRazorpayOpen = vi.fn();
class MockRazorpay {
  constructor(public options: any) {}
  open() {
    mockRazorpayOpen();
    if (this.options.handler) {
      this.options.handler({
        razorpay_order_id: "order_123",
        razorpay_payment_id: "pay_123",
        razorpay_signature: "sig_123",
      });
    }
  }
}
vi.stubGlobal("Razorpay", MockRazorpay);

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock crypto
let uuidCounter = 0;
vi.stubGlobal("crypto", {
  randomUUID: () => `test-uuid-${uuidCounter++}`,
});

describe("BookingModal Smoke Test", () => {
  const defaultProps = {
    experienceId: "exp-1",
    experienceTitle: "Amazing Trek",
    experienceSlug: "amazing-trek",
    basePrice: 5000,
    maxCapacity: 10,
    pickupPoints: ["Point A", "Point B"],
    dropPoints: ["Point A", "Point B"],
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful slot fetch
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/slots")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            slots: [
              { id: "slot-1", date: new Date().toISOString(), capacity: 10, remainingCapacity: 5 }
            ]
          }),
        });
      }
      if (url === "/api/bookings") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            bookingId: "book-123",
            orderId: "order_123",
            amount: 500000,
            currency: "INR",
            keyId: "rzp_test",
          }),
        });
      }
      if (url === "/api/bookings/verify") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });
  });

  it("renders correctly", async () => {
    render(<BookingModal {...defaultProps} />);
    expect(screen.getByText(/Book Experience/i)).toBeInTheDocument();
    expect(screen.getByText(/Amazing Trek/i)).toBeInTheDocument();
  });

  it("progresses through booking steps", async () => {
    render(<BookingModal {...defaultProps} />);

    // Wait for slots to load
    const dateBtn = await screen.findByText(/Select an upcoming date/i);
    fireEvent.click(dateBtn);

    const slotOption = await screen.findByText(/5 spots remaining/i);
    fireEvent.click(slotOption);

    const continueBtn = screen.getByRole("button", { name: /Continue to Details/i });
    fireEvent.click(continueBtn);

    // Step 2: Participants
    await waitFor(() => {
      expect(screen.getByText(/Participant Details/i)).toBeInTheDocument();
    }, { timeout: 3000 });
    
    const phoneInput = screen.getByLabelText(/Phone Number \*/i);
    fireEvent.change(phoneInput, { target: { value: "1111111111" } });

    const summaryBtn = screen.getByRole("button", { name: /Review Booking/i });
    fireEvent.click(summaryBtn);

    // Step 3: Summary
    await waitFor(() => {
      expect(screen.getByText(/Booking Summary/i)).toBeInTheDocument();
    }, { timeout: 3000 });
    const payBtn = screen.getByText(/Pay ₹/i);
    fireEvent.click(payBtn);

    // Step 4: Final Success
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/bookings/book-123/success");
    }, { timeout: 5000 });
  });

  it("handles payment verification failure", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/slots")) return Promise.resolve({ ok: true, json: () => Promise.resolve({ slots: [{ id: "s1", date: new Date().toISOString(), capacity: 10, remainingCapacity: 5 }] }) });
      if (url === "/api/bookings") return Promise.resolve({ ok: true, json: () => Promise.resolve({ bookingId: "b1", orderId: "o1", amount: 100, currency: "INR", keyId: "k" }) });
      if (url === "/api/bookings/verify") return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "Verification failed" }) });
      return Promise.reject(new Error("Unknown"));
    });

    render(<BookingModal {...defaultProps} />);
    fireEvent.click(await screen.findByText(/Select an upcoming date/i));
    fireEvent.click(await screen.findByText(/5 spots remaining/i));
    fireEvent.click(screen.getByRole("button", { name: /Continue to Details/i }));
    
    await waitFor(() => screen.getByLabelText(/Phone Number \*/i));
    fireEvent.change(screen.getByLabelText(/Phone Number \*/i), { target: { value: "1111111111" } });
    fireEvent.click(screen.getByRole("button", { name: /Review Booking/i }));
    
    await waitFor(() => screen.getByText(/Pay ₹/i));
    fireEvent.click(screen.getByText(/Pay ₹/i));

    expect(await screen.findByText(/Verification failed/i)).toBeInTheDocument();
  });
});
