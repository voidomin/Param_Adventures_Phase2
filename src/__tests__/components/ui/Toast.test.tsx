import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ToastProvider, useToast } from "@/components/ui/Toast";

function TestHarness() {
  const toast = useToast();
  return (
    <div>
      <button type="button" onClick={() => toast.success("Payment Successful!")}>
        Fire Success
      </button>
      <button type="button" onClick={() => toast.error("Payment verification failed.")}>
        Fire Error
      </button>
    </div>
  );
}

describe("components/ui/Toast", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("throws when useToast is called outside a ToastProvider", () => {
    const BadComponent = () => {
      useToast();
      return null;
    };
    expect(() => render(<BadComponent />)).toThrow(/useToast must be used within a ToastProvider/);
  });

  it("shows a success toast with a polite live region", async () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText("Fire Success"));

    const toastEl = await screen.findByText("Payment Successful!");
    const region = toastEl.closest('[role="status"]');
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("shows an error toast with an assertive live region", async () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText("Fire Error"));

    const toastEl = await screen.findByText("Payment verification failed.");
    const region = toastEl.closest('[role="alert"]');
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute("aria-live", "assertive");
  });

  it("dismisses a toast when its close button is clicked", async () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText("Fire Success"));
    await screen.findByText("Payment Successful!");

    fireEvent.click(screen.getByLabelText("Dismiss notification"));

    await waitFor(() => {
      expect(screen.queryByText("Payment Successful!")).not.toBeInTheDocument();
    });
  });

  it("auto-dismisses a toast after the timeout", () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText("Fire Success"));
    expect(screen.getByText("Payment Successful!")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByText("Payment Successful!")).not.toBeInTheDocument();
  });
});
