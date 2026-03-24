import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DashboardPage from "@/app/dashboard/page";
import { useRouter } from "next/navigation";
import React from "react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// Mock fetch
globalThis.fetch = vi.fn();

describe("Dashboard Page", () => {
  const mockRouterPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockRouterPush });
  });

  const mockData = {
    user: {
      id: "1",
      name: "Test User",
      email: "test@example.com",
      avatarUrl: null,
      phoneNumber: "1234567890",
      gender: "Male",
      createdAt: new Date().toISOString(),
      roleName: "USER",
    },
    upcomingBookings: [],
    pastBookings: [],
    stats: { total: 0, upcoming: 0, past: 0 },
  };

  it("renders loading state initially", () => {
    (globalThis.fetch as any).mockImplementation(() => new Promise(() => {}));
    render(<DashboardPage />);
    expect(screen.getByText("Loading your dashboard...")).toBeInTheDocument();
  });

  it("redirects to login if unauthorized (401)", async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({ status: 401 });
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/login?redirect=/dashboard");
    });
  });

  it("shows error state on fetch failure", async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({ ok: false });
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText("Something went wrong. Please try again.")).toBeInTheDocument();
    });
  });

  it("renders user dashboard securely", async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });
  });

  it("renders profile completion warning if profile is incomplete", async () => {
    const incompleteUser = { ...mockData, user: { ...mockData.user, phoneNumber: null } };
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => incompleteUser
    });

    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Your profile is incomplete/i)).toBeInTheDocument();
    });
  });

  it("renders Manager Hub for TRIP_MANAGER role", async () => {
    const managerData = { ...mockData, user: { ...mockData.user, roleName: "TRIP_MANAGER" } };
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => managerData
    });

    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText("Manager Hub")).toBeInTheDocument();
    });
  });

  it("renders Trek Lead Hub for TREK_LEAD role", async () => {
    const leadData = { ...mockData, user: { ...mockData.user, roleName: "TREK_LEAD" } };
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => leadData
    });

    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText("Trek Lead Hub")).toBeInTheDocument();
    });
  });
});
