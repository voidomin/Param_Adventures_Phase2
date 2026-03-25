import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import DownloadInvoiceBtn from "@/components/booking/DownloadInvoiceBtn";
import autoTable from "jspdf-autotable";
import jsPDF from "jspdf";

vi.mock("jspdf-autotable", () => ({
  default: vi.fn(),
}));

describe("DownloadInvoiceBtn", () => {
  const basePayload = {
    booking: {
      id: "book-1234",
      date: "2026-01-10T00:00:00.000Z",
      status: "PAID",
      participantCount: 2,
      baseFare: 5000,
      totalPrice: 5900,
      taxBreakdown: [
        { name: "CGST", percentage: 9, amount: 450 },
        { name: "SGST", percentage: 9, amount: 450 },
      ],
    },
    company: {
      companyName: "Param Adventures Pvt Ltd",
      companyAddress: "Dehradun",
      gstNumber: "GST123",
      stateCode: "05",
      panNumber: "PAN123",
    },
    experience: {
      title: "Kedarkantha",
      location: "Uttarakhand",
    },
    primaryContact: {
      name: "Ava",
      email: "ava@example.com",
      phoneNumber: "9999999999",
    },
    payment: {
      providerPaymentId: "pay_123",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => basePayload,
    } as Response);
    vi.spyOn(globalThis, "alert").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders default button text", () => {
    render(<DownloadInvoiceBtn bookingId="book-1234" />);
    expect(screen.getByRole("button", { name: /download tax invoice/i })).toBeInTheDocument();
  });

  it("fetches invoice data and saves PDF on success", async () => {
    render(<DownloadInvoiceBtn bookingId="book-1234" />);

    fireEvent.click(screen.getByRole("button", { name: /download tax invoice/i }));

    expect(screen.getByRole("button", { name: /generating bill/i })).toBeDisabled();

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/bookings/book-1234/invoice");
      expect(autoTable).toHaveBeenCalled();
      expect(jsPDF.prototype.save).toHaveBeenCalledWith("Invoice_PARAM_book.pdf");
    });

    expect(screen.getByRole("button", { name: /download tax invoice/i })).toBeEnabled();
    expect(globalThis.alert).not.toHaveBeenCalled();
  });

  it("uses fallback values when optional company/contact/payment fields are missing", async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        booking: {
          id: "abc-999",
          date: "2026-01-10T00:00:00.000Z",
          status: "PENDING",
          participantCount: 1,
          baseFare: 1000,
          totalPrice: 1000,
        },
        company: {},
        experience: { title: "Mystery Trek", location: "Unknown" },
        primaryContact: null,
        payment: null,
      }),
    });

    render(<DownloadInvoiceBtn bookingId="abc-999" />);
    fireEvent.click(screen.getByRole("button", { name: /download tax invoice/i }));

    await waitFor(() => {
      expect(jsPDF.prototype.save).toHaveBeenCalledWith("Invoice_PARAM_abc.pdf");
    });

    expect(globalThis.alert).not.toHaveBeenCalled();
  });

  it("shows alert when invoice fetch fails", async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({ ok: false });

    render(<DownloadInvoiceBtn bookingId="bad-booking" />);
    fireEvent.click(screen.getByRole("button", { name: /download tax invoice/i }));

    await waitFor(() => {
      expect(globalThis.alert).toHaveBeenCalledWith(
        "Failed to generate invoice. Please try again later.",
      );
    });

    expect(console.error).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /download tax invoice/i })).toBeEnabled();
  });
});
