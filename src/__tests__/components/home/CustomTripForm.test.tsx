import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CustomTripForm from "@/components/home/CustomTripForm";
import React from "react";

describe("CustomTripForm Smoke Test", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders initial form state correctly", () => {
    render(<CustomTripForm />);
    expect(screen.getByText("Plan a Custom Trip")).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send Request/i })).toBeInTheDocument();
  }, 20000);

  it("shows validation error for invalid email", async () => {
    render(<CustomTripForm />);
    
    const nameInput = screen.getByLabelText(/Full Name/i);
    const emailInput = screen.getByLabelText(/Email Address/i);
    const phoneInput = screen.getByLabelText(/Phone Number/i);
    const reqsInput = screen.getByLabelText(/Trip Requirements/i);

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.change(phoneInput, { target: { value: "1234567890" } });
    fireEvent.change(reqsInput, { target: { value: "Some details here for the form." } });

    const form = document.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Invalid email address")).toBeInTheDocument();
    });
  });

  it("shows success state after successful submission", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    render(<CustomTripForm />);
    
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: "john@example.com" } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "1234567890" } });
    fireEvent.change(screen.getByLabelText(/Trip Requirements/i), { target: { value: "We want a custom trek in the Himalayas." } });

    fireEvent.click(screen.getByRole("button", { name: /Send Request/i }));

    await waitFor(() => {
      expect(screen.getByText("Request Received!")).toBeInTheDocument();
    });
  });

  it("shows error state on API failure", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "System overload" }),
    } as Response);

    render(<CustomTripForm />);
    
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: "john@example.com" } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "1234567890" } });
    fireEvent.change(screen.getByLabelText(/Trip Requirements/i), { target: { value: "We want a custom trek in the Himalayas." } });

    fireEvent.click(screen.getByRole("button", { name: /Send Request/i }));

    await waitFor(() => {
      expect(screen.getByText("System overload")).toBeInTheDocument();
    });
  });
});
