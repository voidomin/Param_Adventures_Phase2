import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RefundResolveModal } from "@/components/admin/RefundResolveModal";

globalThis.fetch = vi.fn();

const bankBooking = {
  id: "booking-1",
  paidAmount: 5000,
  refundAmount: 5000,
  refundPreference: "BANK_REFUND",
  cancellationReason: "Customer request",
  user: { name: "Akash" },
  experience: { title: "Everest Base Camp" },
};

describe("RefundResolveModal", () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls onSuccess with the credit note number returned by the API", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, creditNoteNumber: "PARAM/CN/26/0001" }),
    });

    render(<RefundResolveModal booking={bankBooking as any} onClose={onClose} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/Bank UTR/i), { target: { value: "UTR123456" } });
    fireEvent.click(screen.getByRole("button", { name: /mark resolved/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith("PARAM/CN/26/0001");
    });
  });

  it("calls onSuccess with null/undefined when the API resolves with no credit note (zero-amount refund)", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, creditNoteNumber: null }),
    });

    render(<RefundResolveModal booking={bankBooking as any} onClose={onClose} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/Bank UTR/i), { target: { value: "UTR123456" } });
    fireEvent.click(screen.getByRole("button", { name: /mark resolved/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(null);
    });
  });

  it("shows an error and does not call onSuccess when the API call fails", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Refund amount exceeds paid amount." }),
    });

    render(<RefundResolveModal booking={bankBooking as any} onClose={onClose} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/Bank UTR/i), { target: { value: "UTR123456" } });
    fireEvent.click(screen.getByRole("button", { name: /mark resolved/i }));

    expect(await screen.findByText(/Refund amount exceeds paid amount\./i)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("shows a note about the pending coupon restore when the booking's refund request has one", () => {
    render(
      <RefundResolveModal
        booking={{ ...bankBooking, refundRequest: { couponRestoreAmount: 300 } } as any}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const note = screen.getByText(/travel coupon this customer had already redeemed/i);
    expect(note.parentElement?.textContent).toMatch(/restore/i);
    expect(note.parentElement?.textContent).toContain("₹300");
  });

  it("does not show a coupon-restore note when there is nothing pending", () => {
    render(<RefundResolveModal booking={bankBooking as any} onClose={onClose} onSuccess={onSuccess} />);

    expect(screen.queryByText(/travel coupon this customer had already redeemed/i)).not.toBeInTheDocument();
  });
});
