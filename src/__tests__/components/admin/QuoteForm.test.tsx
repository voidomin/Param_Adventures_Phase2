import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import QuoteForm from "@/components/admin/QuoteForm";

describe("QuoteForm", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  it("renders the form for a new quote", () => {
    render(<QuoteForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    expect(screen.getByText("Add New Quote")).toBeInTheDocument();
    expect(screen.getByLabelText(/Quote Text/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Author/i)).toBeInTheDocument();
  });

  it("renders the form with existing quote data", () => {
    const existingQuote = { id: "1", text: "Existing Text", author: "Author", isActive: false };
    render(<QuoteForm quote={existingQuote} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    expect(screen.getByText("Edit Quote")).toBeInTheDocument();
    expect(screen.getByLabelText(/Quote Text/i)).toHaveValue("Existing Text");
    expect(screen.getByLabelText(/Author/i)).toHaveValue("Author");
  });

  it("submits a POST request for a new quote", async () => {
    (globalThis.fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<QuoteForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    fireEvent.change(screen.getByLabelText(/Quote Text/i), { target: { value: "New Quote" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Quote" }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/admin/quotes", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ id: undefined, text: "New Quote", author: "", isActive: true })
      }));
    });

    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("submits a PUT request when editing an existing quote", async () => {
    (globalThis.fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) });

    const existingQuote = { id: "2", text: "Old Text", author: "Author", isActive: true };
    render(<QuoteForm quote={existingQuote} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    fireEvent.change(screen.getByLabelText(/Quote Text/i), { target: { value: "Updated Text" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Quote" }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/admin/quotes/2", expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ id: "2", text: "Updated Text", author: "Author", isActive: true })
      }));
    });

    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it("displays an error message if submission fails", async () => {
    (globalThis.fetch as any).mockResolvedValue({ ok: false, json: async () => ({ error: "Duplicate quote" }) });

    render(<QuoteForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    fireEvent.change(screen.getByLabelText(/Quote Text/i), { target: { value: "Test" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Quote" }));

    expect(await screen.findByText("Duplicate quote")).toBeInTheDocument();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});
