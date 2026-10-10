import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import InvoicesTab from "@/components/admin/settings/InvoicesTab";

// Mock xlsx
const mockJsonToSheet = vi.fn();
mockJsonToSheet.mockReturnValue({});
const mockBookNew = vi.fn(() => ({}));
const mockBookAppendSheet = vi.fn();
const mockWriteFile = vi.fn();

vi.mock("xlsx", () => ({
  utils: {
    json_to_sheet: (...args: any[]) => (mockJsonToSheet as any)(...args),
    book_new: () => mockBookNew(),
    book_append_sheet: (...args: any[]) => (mockBookAppendSheet as any)(...args),
  },
  writeFile: (...args: any[]) => (mockWriteFile as any)(...args),
}));

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("InvoicesTab", () => {
  const mockExperiences = [{ id: "exp-1", title: "Valley Trek" }];
  const mockBookings = [
    {
      id: "b-1",
      invoiceNumber: "INV-001",
      participantCount: 2,
      totalPrice: 10500,
      baseFare: 10000,
      taxBreakdown: [{ name: "GST", percentage: 5, amount: 500 }],
      bookingStatus: "CONFIRMED",
      paymentStatus: "PAID",
      createdAt: "2026-08-15T10:00:00.000Z",
      user: { name: "John Doe", email: "john@example.com", phoneNumber: "9876543210" },
      experience: { id: "exp-1", title: "Valley Trek" },
      slot: {
        id: "s-1",
        date: "2026-09-20T00:00:00.000Z",
        status: "COMPLETED",
        completedAt: "2026-09-22T18:00:00.000Z",
      },
      payments: [{ status: "PAID", provider: "RAZORPAY", providerPaymentId: "pay_123" }],
    },
    {
      id: "b-2",
      invoiceNumber: "INV-002",
      participantCount: 1,
      totalPrice: 5250,
      baseFare: 5000,
      taxBreakdown: [{ name: "GST", percentage: 5, amount: 250 }],
      bookingStatus: "CONFIRMED",
      paymentStatus: "PAID",
      createdAt: "2026-08-20T10:00:00.000Z",
      user: { name: "Jane Smith", email: "jane@example.com", phoneNumber: "9876543211" },
      experience: { id: "exp-1", title: "Valley Trek" },
      slot: {
        id: "s-2",
        date: "2026-10-15T00:00:00.000Z",
        status: "UPCOMING",
      },
      payments: [{ status: "PAID", provider: "RAZORPAY", providerPaymentId: "pay_456" }],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/experiences")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ experiences: mockExperiences }),
        });
      }
      if (url.includes("/api/admin/bookings?")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ bookings: mockBookings }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it("renders search controls and export buttons after search", async () => {
    render(<InvoicesTab />);

    expect(screen.getByText("Audit & Invoice Downloads")).toBeInTheDocument();

    const searchBtn = screen.getByRole("button", { name: /Search Bookings/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /GST Sales Ledger \(Booking Date\)/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Completed Trips GST Ledger \(Excel\)/i })).toBeInTheDocument();
    });
  });

  it("exports only completed trips when Completed Trips GST Ledger button is clicked", async () => {
    render(<InvoicesTab />);

    fireEvent.click(screen.getByRole("button", { name: /Search Bookings/i }));

    const completedExportBtn = await screen.findByRole("button", { name: /Completed Trips GST Ledger \(Excel\)/i });
    fireEvent.click(completedExportBtn);

    await waitFor(() => {
      expect(mockJsonToSheet).toHaveBeenCalled();
      const exportedRows = (mockJsonToSheet.mock.calls as any)[0][0] as Record<string, any>[];
      // Should filter out the UPCOMING trip (b-2) and export only completed trip (b-1)
      expect(exportedRows).toHaveLength(1);
      expect(exportedRows[0]["Booking ID"]).toBe("b-1");
      expect(exportedRows[0]["Return Period (Mon-YYYY)"]).toBe("Sept-2026");
      expect(mockWriteFile).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("gst_completed_trips_export_"));
    });
  });
});
