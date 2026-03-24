import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DownloadItineraryBtn from "@/components/experiences/DownloadItineraryBtn";
import React from "react";

const { mockSave } = vi.hoisted(() => ({
  mockSave: vi.fn(),
}));

vi.mock("jspdf", () => {
  const mockAddPage = vi.fn();
  const mockText = vi.fn();
  const mockAddImage = vi.fn();
  const mockGetNumberOfPages = vi.fn(() => 2);
  const mockSetPage = vi.fn();

  class MockGState {
    public opacity: number;
    constructor({ opacity }: { opacity: number }) {
      this.opacity = opacity;
    }
  }

  class MockJsPDF {
    constructor() {
      (this as any).GState = MockGState;
      (this as any).lastAutoTable = { finalY: 100 };
    }
    internal = {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    };
    save = mockSave;
    addPage = mockAddPage;
    text = mockText.mockReturnValue(this);
    addImage = mockAddImage.mockReturnValue(this);
    getNumberOfPages = mockGetNumberOfPages;
    setPage = mockSetPage.mockReturnValue(this);
    setFontSize = vi.fn().mockReturnValue(this);
    setFont = vi.fn().mockReturnValue(this);
    setTextColor = vi.fn().mockReturnValue(this);
    setFillColor = vi.fn().mockReturnValue(this);
    rect = vi.fn().mockReturnValue(this);
    line = vi.fn().mockReturnValue(this);
    setLineWidth = vi.fn().mockReturnValue(this);
    setDrawColor = vi.fn().mockReturnValue(this);
    splitTextToSize = vi.fn((text) => [text]);
    roundedRect = vi.fn().mockReturnValue(this);
    setGState = vi.fn().mockReturnValue(this);
    circle = vi.fn().mockReturnValue(this);
  }

  return {
    default: MockJsPDF,
  };
});

// Mock location
vi.stubGlobal("location", {
  origin: "http://localhost:3000",
});

// Mock jspdf-autotable
vi.mock("jspdf-autotable", () => ({
  default: vi.fn((doc, options) => {
    doc.lastAutoTable = { finalY: (options.startY || 0) + 50 };
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.setConfig({ testTimeout: 30000 });

describe("DownloadItineraryBtn Smoke Test", () => {
  const defaultProps = {
    slug: "amazing-trek",
    variant: "sidebar" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // @ts-ignore
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/itinerary-data")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            title: "Amazing Trek",
            location: "Himalayas",
            durationDays: 5,
            company: { name: "Param", email: "test@param.com", phone: "123", website: "param.com" },
            itinerary: [{ title: "Day 1", description: "Start" }],
            images: ["img1.jpg"],
            coverImage: "cover.jpg",
          }),
        });
      }
      if (url.includes("/api/proxy-image") || url.includes("/param-logo.png")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ dataUrl: "data:image/png;base64,abc" }),
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });
  });

  it("renders correctly in sidebar variant", () => {
    render(<DownloadItineraryBtn {...defaultProps} />);
    expect(screen.getByText(/Download Itinerary/i)).toBeInTheDocument();
  });

  it("renders correctly in success variant", () => {
    render(<DownloadItineraryBtn slug="trek" variant="success" />);
    expect(screen.getByText(/Download Trip Itinerary \(PDF\)/i)).toBeInTheDocument();
  });

  it("triggers PDF generation on click", async () => {
    vi.spyOn(globalThis, "alert").mockImplementation(() => {});
    render(<DownloadItineraryBtn {...defaultProps} />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);

    expect(screen.getByText(/Generating Itinerary/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalled();
    }, { timeout: 15000 });

    expect(screen.getByText(/Download Itinerary/i)).toBeInTheDocument();
  });

  it("handles fetch failure gracefully", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    vi.spyOn(globalThis, "alert").mockImplementation(() => {});

    render(<DownloadItineraryBtn {...defaultProps} />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);

    await waitFor(() => {
      expect(globalThis.alert).toHaveBeenCalledWith("Error generating PDF.");
    });
  });
});
