import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import RoleGuardLayout from "@/components/layout/RoleGuardLayout";

const mockPush = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/dashboard/manager",
}));

vi.mock("@/lib/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("RoleGuardLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading spinner while auth is resolving", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true });

    render(
      <RoleGuardLayout allowedRoles={["ADMIN"]}>
        <div>Protected content</div>
      </RoleGuardLayout>,
    );

    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("redirects to login with a return path when signed out", async () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });

    render(
      <RoleGuardLayout allowedRoles={["ADMIN"]}>
        <div>Protected content</div>
      </RoleGuardLayout>,
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login?redirect=%2Fdashboard%2Fmanager");
    });
  });

  it("renders children when the user's role is allowed", () => {
    mockUseAuth.mockReturnValue({ user: { role: "ADMIN" }, isLoading: false });

    render(
      <RoleGuardLayout allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
        <div>Protected content</div>
      </RoleGuardLayout>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("redirects to the role-specific fallback when signed in but unauthorized", async () => {
    mockUseAuth.mockReturnValue({ user: { role: "TREK_LEAD" }, isLoading: false });

    render(
      <RoleGuardLayout
        allowedRoles={["TRIP_MANAGER", "ADMIN"]}
        fallbackRedirects={{ TREK_LEAD: "/dashboard/trek-lead" }}
      >
        <div>Protected content</div>
      </RoleGuardLayout>,
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard/trek-lead");
    });
  });

  it("redirects to the generic dashboard when no fallback is configured for the role", async () => {
    mockUseAuth.mockReturnValue({ user: { role: "REGISTERED_USER" }, isLoading: false });

    render(
      <RoleGuardLayout allowedRoles={["ADMIN"]}>
        <div>Protected content</div>
      </RoleGuardLayout>,
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });
});
