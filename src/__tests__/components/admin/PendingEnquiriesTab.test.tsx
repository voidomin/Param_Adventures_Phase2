import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PendingEnquiriesTab } from "@/components/admin/PendingEnquiriesTab";

globalThis.fetch = vi.fn();

describe("PendingEnquiriesTab Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially and empty state when no enquiries exist", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ pendingEnquiries: [] }),
    });

    render(<PendingEnquiriesTab />);

    expect(screen.getByText(/Loading pending sales enquiries/i)).toBeInTheDocument();

    const emptyText = await screen.findByText(/No Pending Enquiries/i);
    expect(emptyText).toBeInTheDocument();
  });

  it("renders pending enquiry card with customer details and call/WhatsApp links", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        pendingEnquiries: [
          {
            id: "b1",
            createdAt: new Date().toISOString(),
            participantCount: 2,
            totalPrice: "6000",
            user: {
              name: "Samantha Roy",
              email: "samantha@example.com",
              phoneNumber: "+919876543210",
            },
            experience: {
              title: "Tadiandamol Trek",
              slug: "tadiandamol-trek",
            },
            slot: {
              date: "2026-09-01T00:00:00.000Z",
            },
          },
        ],
      }),
    });

    render(<PendingEnquiriesTab />);

    const customerName = await screen.findByText("Samantha Roy");
    expect(customerName).toBeInTheDocument();
    expect(screen.getByText(/Tadiandamol Trek/i)).toBeInTheDocument();

    const callLink = screen.getByRole("link", { name: /Call/i });
    expect(callLink).toHaveAttribute("href", "tel:+919876543210");

    const whatsappLink = screen.getByRole("link", { name: /WhatsApp/i });
    expect(whatsappLink).toHaveAttribute("href", "https://wa.me/919876543210");
  });

  it("renders error alert on fetch failure", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<PendingEnquiriesTab />);

    const errorMsg = await screen.findByText(/Failed to load sales enquiries/i);
    expect(errorMsg).toBeInTheDocument();
  });
});
