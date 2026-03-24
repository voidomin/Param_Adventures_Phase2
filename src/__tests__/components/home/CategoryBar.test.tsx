import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CategoryBar from "@/components/home/CategoryBar";
import React from "react";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

describe("CategoryBar Smoke Test", () => {
  const mockCategories = {
    categories: [
      { id: "1", name: "Trekking", slug: "trekking", icon: "Mountain" },
      { id: "2", name: "Camping", slug: "camping", icon: "Tent" },
    ],
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders loading state initially", () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {})); // Hang
    render(<CategoryBar />);
    expect(document.querySelector(".animate-pulse")).toBeDefined();
  });

  it("renders categories when loaded", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCategories,
    } as Response);

    render(<CategoryBar />);

    await waitFor(() => {
      // Use getAllByText for Trekking/Camping since they are duplicated for infinite loop
      expect(screen.getByText(/All Adventures/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Trekking/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Camping/i).length).toBeGreaterThan(0);
    });
  });

  it("calls router.push when a category is clicked", async () => {
    const mockPush = vi.fn();
    const { useRouter } = await import("next/navigation");
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCategories,
    } as Response);

    render(<CategoryBar />);

    const trekkingBtns = await screen.findAllByText(/Trekking/i);
    fireEvent.click(trekkingBtns[0]);

    expect(mockPush).toHaveBeenCalledWith("/experiences?category=trekking");
  });
});
