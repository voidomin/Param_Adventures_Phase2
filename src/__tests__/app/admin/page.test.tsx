import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AdminDashboardPage from "@/app/admin/page";

const mockPush = vi.fn();
const mockFetch = vi.fn();
const mockHasPermission = vi.fn();
const mockUseAuth = vi.fn();

vi.stubGlobal("fetch", mockFetch);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/components/admin/DashboardCharts", () => ({
  default: () => <div data-testid="dashboard-charts">Charts</div>,
}));

describe("app/admin/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { role: "SUPER_ADMIN" },
      hasPermission: mockHasPermission,
    });
    mockHasPermission.mockReturnValue(false);
  });

  it("redirects non-super-admin users based on permissions", async () => {
    mockUseAuth.mockReturnValue({
      user: { role: "ADMIN" },
      hasPermission: (perm: string) => perm === "user:view-all",
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/admin/users");
    });
  });

  it("loads and renders dashboard for super admin", async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      json: async () => ({
        metrics: {
          totalRevenue30d: 1000,
          activeBookings30d: 12,
          upcomingTrips: 3,
          totalUsers: 20,
          totalExperiences: 5,
        },
        pendingActions: {
          blogs: 2,
          bookings: 1,
        },
        recentActivity: [],
        charts: {
          revenueByMonth: [],
          bookingsByStatus: [],
          topExperiences: [],
          userGrowth: [],
        },
      }),
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeInTheDocument();
    });
    expect(screen.getByTestId("dashboard-charts")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("/api/admin/dashboard");
  });

  it("redirects to dashboard when api returns unauthorized", async () => {
    mockFetch.mockResolvedValue({
      status: 401,
      json: async () => ({ error: "unauthorized" }),
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });
});
