import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import ShareButton from "@/components/ui/ShareButton";

describe("ShareButton", () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, "navigator", {
      value: { ...originalNavigator, clipboard: { writeText: vi.fn() }, share: vi.fn(), canShare: vi.fn().mockReturnValue(true) },
      writable: true,
    });
    Object.defineProperty(globalThis.window, "location", {
      value: { href: "http://localhost/test", origin: "http://localhost" },
      writable: true,
    });
  });

  it("renders with default props", () => {
    render(<ShareButton title="Test Title" />);
    expect(screen.getByRole("button", { name: /Share/i })).toBeInTheDocument();
  });

  it("calls navigator.share if available and supported", async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "share", { value: mockShare });
    
    render(<ShareButton title="Awesome Trip" url="/awesome" />);
    
    const btn = screen.getByRole("button", { name: /Share/i });
    fireEvent.click(btn);
    
    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith({
        title: "Awesome Trip",
        text: "Check out this experience on Param Adventures: Awesome Trip",
        url: "http://localhost/awesome"
      });
    });
  });

  it("falls back to clipboard copy if share is unsupported", async () => {
    // Remove share to trigger fallback
    Object.defineProperty(globalThis.navigator, "share", { value: undefined });
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: { writeText: mockWriteText },
    });
    
    render(<ShareButton title="Test Title" url="https://example.com" />);
    
    const btn = screen.getByRole("button", { name: /Share/i });
    fireEvent.click(btn);
    
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith("https://example.com");
    });
    
    // Check if the "Link Copied!" text appears
    expect(screen.getByText("Link Copied!")).toBeInTheDocument();
  });

  it("handles share errors gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockShare = vi.fn().mockRejectedValue(new Error("Share failed"));
    Object.defineProperty(globalThis.navigator, "share", { value: mockShare });
    
    render(<ShareButton title="Error Test" />);
    const btn = screen.getByRole("button", { name: /Share/i });
    fireEvent.click(btn);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Error sharing:", expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });
});
