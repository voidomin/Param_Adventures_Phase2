import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AdminDashboardPage from "@/app/admin/page";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import React from "react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// Mock AuthContext
vi.mock("@/lib/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock fetch
globalThis.fetch = vi.fn();

// Mock DashboardCharts
vi.mock("@/components/admin/DashboardCharts", () => ({
  default: () => <div data-testid="dashboard-charts" />
}));

describe("AdminDashboard Page", () => {
  const mockRouterPush = vi.fn();
  
  const mockAuthContext = {
    user: { role: "SUPER_ADMIN" },
    hasPermission: vi.fn().mockReturnValue(true),
  };

  const mockData = {
    metrics: {
      totalRevenue30d: 50000,
      activeBookings30d: 10,
      upcomingTrips: 5,
      totalUsers: 100,
      totalExperiences: 20,
    },
    pendingActions: { blogs: 2, bookings: 1 },
    recentActivity: [],
    charts: {} // Handled by mock
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockRouterPush });
    (useAuth as any).mockReturnValue(mockAuthContext);
  });

  it("renders loading initially or if no user", () => {
    (globalThis.fetch as any).mockImplementation(() => new Promise(() => {}));
    render(<AdminDashboardPage />);
    // Component handles its own loading state based on fetch
    expect(screen.queryByRole("status", { hidden: true }) || document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it("redirects non-SUPER_ADMIN to their highest permission route", () => {
    (useAuth as any).mockReturnValue({
      user: { role: "ADMIN" },
      hasPermission: (p: string) => p === "trip:create",
    });

    render(<AdminDashboardPage />);
    expect(mockRouterPush).toHaveBeenCalledWith("/admin/experiences");
  });

  it("fetches and renders SUPER_ADMIN dashboard successfully", async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    render(<AdminDashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeInTheDocument();
      expect(screen.getByText("₹50,000")).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-charts")).toBeInTheDocument();
    });
  });

  it("handles fetch errors gracefully", async () => {
    (globalThis.fetch as any).mockRejectedValueOnce(new Error("Network err"));

    render(<AdminDashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText("Failed to load dashboard data")).toBeInTheDocument();
    });
  });
});
