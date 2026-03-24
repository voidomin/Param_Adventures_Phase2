import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ManualVerifyModal } from "@/components/admin/ManualVerifyModal";

// Mock fetch globally
globalThis.fetch = vi.fn();

describe("ManualVerifyModal", () => {
  const mockProps = {
    bookingId: "booking-123",
    bookingAmount: 5000,
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockReset();
    
    // Standard mock for successful upload
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes("/cloudinary-sign")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            apiKey: "key", timestamp: 1234, signature: "sig", folder: "fp", cloudName: "cn" 
          }),
        });
      }
      if (url.includes("cloudinary.com")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ secure_url: "https://proof.url" }),
        });
      }
      if (url.includes("/verify-manual")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "None" }) });
    });
  });

  it("renders the modal and handles unsuccessful upload", async () => {
    (fetch as any).mockImplementationOnce(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "Upload Failed" }) }));
    render(<ManualVerifyModal {...mockProps} />);
    const fileInput = screen.getByLabelText(/Click to upload proof/i);
    fireEvent.change(fileInput, { target: { files: [new File([""], "p.png")] } });
    await waitFor(() => expect(screen.getByText(/Upload Failed/i)).toBeInTheDocument());
  });

  it("submits the form successfully after file upload", async () => {
    render(<ManualVerifyModal {...mockProps} />);

    // 1. Upload proof
    const fileInput = screen.getByLabelText(/Click to upload proof/i);
    fireEvent.change(fileInput, { target: { files: [new File(["abc"], "proof.png", { type: "image/png" })] } });
    await waitFor(() => expect(screen.getByText(/Screenshot Uploaded/i)).toBeInTheDocument(), { timeout: 10000 });

    // 2. Fill form
    fireEvent.change(screen.getByPlaceholderText(/e.g. PAY-123456789/i), { target: { value: "TXN123" } });
    
    // 3. Submit
    const submitBtn = screen.getByRole("button", { name: /Confirm Payment/i });
    fireEvent.click(submitBtn);

    await waitFor(() => expect(screen.getByText(/Payment Confirmed!/i)).toBeInTheDocument(), { timeout: 10000 });
    await waitFor(() => expect(mockProps.onSuccess).toHaveBeenCalled(), { timeout: 10000 });
  });

  it("handles verification API errors", async () => {
    // Force the verification part of the mock to fail
    (fetch as any).mockImplementation((url: string) => {
       if (url.includes("/cloudinary-sign")) return Promise.resolve({ ok: true, json: () => Promise.resolve({ apiKey: "k", timestamp: 1, signature: "s", folder: "f", cloudName: "c" }) });
       if (url.includes("cloudinary.com")) return Promise.resolve({ ok: true, json: () => Promise.resolve({ secure_url: "url" }) });
       if (url.includes("/verify-manual")) return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "Verification Failed" }) });
       return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });

    render(<ManualVerifyModal {...mockProps} />);

    // 1. Upload proof
    const fileInput = screen.getByLabelText(/Click to upload proof/i);
    fireEvent.change(fileInput, { target: { files: [new File(["abc"], "proof.png")] } });
    await waitFor(() => expect(screen.getByText(/Screenshot Uploaded/i)).toBeInTheDocument(), { timeout: 3000 });

    // 2. Fill form
    fireEvent.change(screen.getByPlaceholderText(/e.g. PAY-123456789/i), { target: { value: "TXN123" } });
    
    // 3. Submit
    const submitBtn = screen.getByRole("button", { name: /Confirm Payment/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Verification Failed/i)).toBeInTheDocument();
  });
});
