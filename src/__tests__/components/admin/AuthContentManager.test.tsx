import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import AuthContentManager from "@/components/admin/AuthContentManager";
import React from "react";

// Mock fetch
globalThis.fetch = vi.fn();

describe("AuthContentManager Component", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    // Provide a never-resolving promise to keep it in loading state
    (globalThis.fetch as any).mockImplementation(() => new Promise(() => {}));
    const { container } = render(<AuthContentManager />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("fetches settings and renders UI", async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        settings: {
          "auth_common_tagline": "Test Tagline"
        }
      })
    });
    
    render(<AuthContentManager />);
    
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/admin/settings");
    
    // Wait for the UI to render the fetched data
    await waitFor(() => {
      expect(screen.getByText("Global Styles")).toBeInTheDocument();
    }, { timeout: 10000 });
    
    // The input should have the value we passed
    const inputs = screen.getAllByRole("textbox");
    // auth_common_tagline is an input (not textarea) and is the first one rendered
    expect(inputs[0]).toHaveValue("Test Tagline");
  }, 20000);

  it("handles saving a setting correctly", async () => {
    // 1. Initial fetch mock
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        settings: {
          "auth_common_tagline": "Test Tagline"
        }
      })
    });
    
    render(<AuthContentManager />);
    
    await waitFor(() => {
      expect(screen.getByText("Global Styles")).toBeInTheDocument();
    });

    // 2. Mock save request
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true
    });

    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "New Tagline" } });
    
    // Changing triggers handleSave on blur
    fireEvent.blur(inputs[0]);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "auth_common_tagline", value: "New Tagline" }),
      });
      expect(screen.getByText("Setting saved successfully!")).toBeInTheDocument();
    });
  });

  it("shows error message when saving fails", async () => {
    // 1. Initial fetch mock
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ settings: {} })
    });
    
    render(<AuthContentManager />);
    await waitFor(() => expect(screen.getByText("Global Styles")).toBeInTheDocument());

    // 2. Mock failed save request
    (globalThis.fetch as any).mockResolvedValueOnce({ ok: false });

    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "Bad Tagline" } });
    fireEvent.blur(inputs[0]);

    await waitFor(() => {
      expect(screen.getByText("Failed to save setting.")).toBeInTheDocument();
    });
  });
});
