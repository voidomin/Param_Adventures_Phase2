import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CategoryBar from "../../../components/home/CategoryBar";
import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";

const mockRouter = {
  push: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

// Mock framer-motion to avoid animation delays in tests
vi.mock("framer-motion", async () => {
  const React = await import("react");
  return {
    motion: {
      button: React.forwardRef(({ children, onClick, className, ...props }: any, ref: any) => (
        <button onClick={onClick} className={className} ref={ref} {...props}>
          {children}
        </button>
      )),
      div: React.forwardRef(({ children, className, ...props }: any, ref: any) => (
        <div className={className} ref={ref} {...props}>{children}</div>
      )),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock Scroll APIs
Object.defineProperty(HTMLElement.prototype, 'scrollLeft', { value: 0, writable: true });
Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { value: 1000, writable: true });
Object.defineProperty(HTMLElement.prototype, 'clientWidth', { value: 500, writable: true });
HTMLElement.prototype.scrollBy = vi.fn();
HTMLElement.prototype.scrollTo = vi.fn();

describe("CategoryBar Smoke Test", () => {
  const mockCategories = [
    { id: "1", name: "Trekking", slug: "trekking", icon: "Mountain" },
    { id: "2", name: "Camping", slug: "camping", icon: "Tent" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ categories: mockCategories }),
    });
  });

  it("renders loading state initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // Never resolves
    render(<CategoryBar />);
    const pulses = document.getElementsByClassName("animate-pulse");
    expect(pulses.length).toBeGreaterThan(0);
  });

  it("renders categories and handles selection", async () => {
    render(<CategoryBar />);

    await waitFor(() => {
      // Use getAllByText because categories are duplicated for infinite scroll illusion
      expect(screen.getAllByText("Trekking")[0]).toBeInTheDocument();
      expect(screen.getAllByText("Camping")[0]).toBeInTheDocument();
    });

    // Click "All Adventures"
    fireEvent.click(screen.getByText(/All Adventures/i));
    expect(mockRouter.push).toHaveBeenCalledWith("/experiences");

    // Click "Trekking"
    const trekBtns = screen.getAllByText("Trekking");
    fireEvent.click(trekBtns[0]);
    expect(mockRouter.push).toHaveBeenCalledWith("/experiences?category=trekking");
  });


  it("handles fetch failure gracefully", async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch.mockRejectedValue(new Error("Network Error"));
    
    render(<CategoryBar />);
    await waitFor(() => {
      expect(screen.queryByText("Trekking")).not.toBeInTheDocument();
      expect(screen.getByText(/All Adventures/i)).toBeInTheDocument();
    });
  });
});
