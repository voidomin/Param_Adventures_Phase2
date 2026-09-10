import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import HomepageSectionsTab from "@/components/admin/HomepageSectionsTab";

const mockSection = {
  id: "sec-1",
  layout: "MOSAIC_GRID",
  name: "Weekend Getaways",
  heading: "Weekend Getaways Heading",
  subheading: "Short escapes",
  displayOrder: 1,
  isActive: true,
  experienceCount: 2,
};

describe("HomepageSectionsTab", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("fetches and renders the fixed sections with their layout label", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sections: [mockSection] }),
    } as Response);

    render(<HomepageSectionsTab />);

    await waitFor(() => expect(screen.getByDisplayValue("Weekend Getaways")).toBeInTheDocument());
    expect(screen.getByText("Mosaic Grid")).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.textContent === "2 trips assigned")).toBeInTheDocument();
  });

  it("disables Save until a field is edited, then submits the PUT", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sections: [mockSection] }) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ section: { ...mockSection, name: "Short Trips" } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sections: [{ ...mockSection, name: "Short Trips" }] }),
      } as Response);

    render(<HomepageSectionsTab />);
    await waitFor(() => expect(screen.getByDisplayValue("Weekend Getaways")).toBeInTheDocument());

    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).toBeDisabled();

    fireEvent.change(screen.getByDisplayValue("Weekend Getaways"), { target: { value: "Short Trips" } });
    expect(saveButton).not.toBeDisabled();

    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/homepage-sections/sec-1",
        expect.objectContaining({ method: "PUT" }),
      ),
    );
  });

  it("shows a per-section error message when the save fails", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sections: [mockSection] }) } as Response)
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Something went wrong" }) } as Response);

    render(<HomepageSectionsTab />);
    await waitFor(() => expect(screen.getByDisplayValue("Weekend Getaways")).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue("Weekend Getaways"), { target: { value: "Short Trips" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(screen.getByText("Something went wrong")).toBeInTheDocument());
  });
});
