import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import AuthContentManager from "@/components/admin/AuthContentManager";

describe("AuthContentManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  it("fetches and renders settings on mount", async () => {
    const mockSettings = [
      { key: "auth_common_tagline", value: "Test Tagline" },
      { key: "auth_login_form_heading", value: "Test Heading" },
    ];
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ settings: mockSettings }),
    });

    render(<AuthContentManager />);
    
    // Shows loading initially
    // wait for it to load
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/admin/settings");
    });
    
    // Check if input value is populated
    const inputs = await screen.findAllByRole("textbox");
    expect(inputs.some((input) => (input as HTMLInputElement).value === "Test Tagline")).toBe(true);
  });

  it("handles saving a setting", async () => {
    const mockSettings = [{ key: "auth_common_tagline", value: "Test Tagline" }];
    (globalThis.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ settings: mockSettings }) }) // GET
      .mockResolvedValueOnce({ ok: true }); // PUT

    render(<AuthContentManager />);
    
    const inputs = await screen.findAllByRole("textbox");
    expect(inputs.length).toBeGreaterThan(0);

    // Find the save button associated with common tagline
    const saveButtons = await screen.findAllByText(/Save Changes/i);
    expect(saveButtons.length).toBeGreaterThan(0);
    
    // Modify input and blur (or click save)
    const textboxes = screen.getAllByRole("textbox");
    fireEvent.change(textboxes[0], { target: { value: "New Tagline" } });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/admin/settings", expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ key: "auth_common_tagline", value: "New Tagline" })
      }));
    });

    expect(await screen.findByText("Setting saved successfully!")).toBeInTheDocument();
  });
});
