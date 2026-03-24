import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
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
  const mockData = {
    revenueByMonth: [{ month: "Jan", revenue: 5000 }],
    bookingsByStatus: [{ status: "CONFIRMED", count: 10, color: "#000" }],
    topExperiences: [{ name: "Trek", bookings: 5 }],
    userGrowth: [{ month: "Jan", users: 50 }],
  };

  it("renders correctly with data", () => {
    render(<DashboardCharts charts={mockData} />);
    
    // Check titles
    expect(screen.getByText("Revenue Trend (6 Months)")).toBeInTheDocument();
    expect(screen.getByText("Booking Distribution")).toBeInTheDocument();
    expect(screen.getByText("Top Experiences by Bookings")).toBeInTheDocument();
    expect(screen.getByText("User Registration Trend")).toBeInTheDocument();

    // Check custom labels that show up in DOM
    expect(screen.getByText("CONFIRMED")).toBeInTheDocument();
  });

  it("shows empty states when data is missing", () => {
    const emptyData = {
      revenueByMonth: [],
      bookingsByStatus: [],
      topExperiences: [],
      userGrowth: [],
    };
    render(<DashboardCharts charts={emptyData} />);
    
    expect(screen.getByText("No bookings yet")).toBeInTheDocument();
    expect(screen.getByText("No data yet")).toBeInTheDocument();
  });
});
