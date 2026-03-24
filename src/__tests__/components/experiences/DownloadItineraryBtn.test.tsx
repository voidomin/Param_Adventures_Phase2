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

  it("triggers PDF generation with full data", async () => {
    vi.spyOn(globalThis, "alert").mockImplementation(() => {});
    
    // Test a very rich data set to hit highlights, description, itchy, etc.
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/itinerary-data")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            title: "Super Mega Adventure",
            location: "Nepal",
            durationDays: 14,
            maxAltitude: "5545m",
            trekDistance: "130km",
            difficulty: "HARD",
            bestTimeToVisit: "Spring/Autumn",
            maxGroupSize: 12,
            company: { name: "Param", email: "test@param.com", phone: "123", website: "param.com" },
            highlights: ["Highlight 1", "Highlight 2"],
            description: "Extra long description to trigger page breaks and line splitting in the PDF generator logic.",
            itinerary: [
              { title: "Day 1", description: "Arrival", meals: "Dinner", accommodation: "Hotel" },
              { title: "Day 2", description: "Trek start" }
            ],
            inclusions: ["Inc 1", "Inc 2"],
            exclusions: ["Exc 1"],
            thingsToCarry: ["Boots", "Jacket", "Water"],
            meetingPoint: "Kathmandu",
            meetingTime: "8:00 AM",
            cancellationPolicy: "Non-refundable if cancelled within 24 hours.",
            images: ["img1.jpg", "img2.jpg", "img3.jpg", "img4.jpg"],
            coverImage: "cover.jpg",
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ dataUrl: "data:image/png;base64,mock" }),
      });
    });

    render(<DownloadItineraryBtn slug="rich-trek" variant="sidebar" />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(expect.stringContaining("Super_Mega_Adventure"));
    }, { timeout: 15000 });
  });

  it("handles image fetch failure gracefully within the PDF flow", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/itinerary-data")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            title: "Fail Trek",
            location: "Unknown",
            durationDays: 1,
            company: { website: "a.com" },
            images: ["broken.jpg"],
          }),
        });
      }
      if (url.includes("/api/proxy-image")) {
        return Promise.resolve({ ok: false }); // Proxy fails
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<DownloadItineraryBtn slug="fail-trek" variant="inline" />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalled();
    }, { timeout: 15000 });
  });

  it("works with success variant and missing fields", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/itinerary-data")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            title: "Min Trek",
            location: "Void",
            durationDays: 1,
            company: { website: "p.com" },
            // Missing Highlights, Desc, Itinerary, etc.
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<DownloadItineraryBtn slug="min-trek" variant="success" />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalled();
    }, { timeout: 15000 });
  });

  it("shows alert when itinerary-data fetch fails", async () => {
    const alertSpy = vi.spyOn(globalThis, "alert").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/itinerary-data")) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<DownloadItineraryBtn slug="bad-trek" variant="sidebar" />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Error generating PDF.");
    }, { timeout: 15000 });

    alertSpy.mockRestore();
  });

  it("renders inline variant with correct text", () => {
    render(<DownloadItineraryBtn slug="inline-trek" variant="inline" />);
    expect(screen.getByText(/Download Itinerary/i)).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("generates PDF with no itinerary, inclusions, or logistics data", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/itinerary-data")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            title: "Empty Trek",
            location: "Nowhere",
            durationDays: 1,
            company: { name: "Param", email: "t@p.com", phone: "123", website: "p.com" },
            itinerary: [],
            inclusions: [],
            exclusions: [],
            thingsToCarry: [],
            highlights: [],
            images: [],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<DownloadItineraryBtn slug="empty-trek" variant="sidebar" />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(expect.stringContaining("Empty_Trek"));
    }, { timeout: 15000 });
  });
});
