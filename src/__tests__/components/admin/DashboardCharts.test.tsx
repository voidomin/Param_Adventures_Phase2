import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import DashboardCharts from "@/components/admin/DashboardCharts";
import React from "react";

// Polyfill ResponsiveContainer for Recharts in JSDOM so it doesn't crash or hide children

vi.mock("recharts", async () => {
  const OriginalRecharts = await vi.importActual("recharts");
  return {
    ...OriginalRecharts as any,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 800, height: 800 }} data-testid="responsive-container">
        {children}
      </div>
    ),
  };
});

describe("DashboardCharts Component", () => {
  afterEach(cleanup);

  const mockData = {
    revenueByMonth: [{ month: "Jan", revenue: 5000 }],
    bookingsByStatus: [{ status: "CONFIRMED", count: 10, color: "#000" }],
    topExperiences: [{ name: "Trek", bookings: 5 }],
    userGrowth: [{ month: "Jan", users: 50 }],
  };

  it("renders correctly with data", async () => {
    render(<DashboardCharts charts={mockData} />);
    
    // Use findByText to wait for the 1.2s mount delay to settle
    // Increase timeout to 3000ms since delay is 1200ms
    expect(await screen.findByText("Revenue Trend (6 Months)", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText("Booking Distribution")).toBeInTheDocument();
    expect(screen.getByText("Top Experiences by Bookings")).toBeInTheDocument();
    expect(screen.getByText("User Registration Trend")).toBeInTheDocument();

    // Check custom labels that show up in DOM
    expect(screen.getByText("CONFIRMED")).toBeInTheDocument();
  });

  it("shows empty states when data is missing", async () => {
    const emptyData = {
      revenueByMonth: [],
      bookingsByStatus: [],
      topExperiences: [],
      userGrowth: [],
    };
    render(<DashboardCharts charts={emptyData} />);
    
    // Wait for mount delay with increased timeout
    expect(await screen.findByText("No bookings yet", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText("No data yet")).toBeInTheDocument();
  });
});
