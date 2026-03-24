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

  it("clicking a category and then All Adventures resets active state", async () => {
    render(<CategoryBar />);
    await waitFor(() => {
      expect(screen.getAllByText("Trekking")[0]).toBeInTheDocument();
    });

    // Click a specific category
    fireEvent.click(screen.getAllByText("Trekking")[0]);
    expect(mockRouter.push).toHaveBeenCalledWith("/experiences?category=trekking");

    // Click "All Adventures" to reset
    fireEvent.click(screen.getByText(/All Adventures/i));
    expect(mockRouter.push).toHaveBeenCalledWith("/experiences");
  });

  it("renders fallback icon for unknown icon names", async () => {
    const categoriesWithBadIcon = [
      { id: "1", name: "Mystery", slug: "mystery", icon: "NonExistentIcon" },
      { id: "2", name: "Plain", slug: "plain", icon: null },
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ categories: categoriesWithBadIcon }),
    });

    render(<CategoryBar />);
    await waitFor(() => {
      expect(screen.getAllByText("Mystery")[0]).toBeInTheDocument();
      expect(screen.getAllByText("Plain")[0]).toBeInTheDocument();
    });
  });

  it("renders only All Adventures when categories array is empty", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ categories: [] }),
    });

    render(<CategoryBar />);
    await waitFor(() => {
      expect(screen.getByText(/All Adventures/i)).toBeInTheDocument();
    });
    expect(screen.queryByText("Trekking")).not.toBeInTheDocument();
  });

  it("handles non-ok API response without crashing", async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Internal Server Error" }),
    });

    render(<CategoryBar />);
    await waitFor(() => {
      expect(screen.getByText(/All Adventures/i)).toBeInTheDocument();
    });
    expect(screen.queryByText("Trekking")).not.toBeInTheDocument();
  });

  it("scroll buttons trigger scroll navigation when clicked", async () => {
    render(<CategoryBar />);
    await waitFor(() => {
      expect(screen.getAllByText("Trekking")[0]).toBeInTheDocument();
    });

    const leftBtn = screen.getByLabelText("Scroll left");
    const rightBtn = screen.getByLabelText("Scroll right");

    fireEvent.click(rightBtn);
    fireEvent.click(leftBtn);

    // scrollTo is used for wrap-around when at scroll boundaries
    expect(HTMLElement.prototype.scrollTo).toHaveBeenCalled();
  });

  it("updates state on globalThis resize", async () => {
    render(<CategoryBar />);
    await waitFor(() => {
      expect(screen.queryByText("All Adventures")).toBeInTheDocument();
    });
    fireEvent(globalThis as unknown as Window, new Event('resize'));
    expect(screen.queryByText("All Adventures")).toBeInTheDocument();
  });
});
