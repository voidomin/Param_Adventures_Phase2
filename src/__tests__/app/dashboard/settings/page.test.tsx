import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsPage from "@/app/dashboard/settings/page";

const mockFetch = vi.fn();
const mockMutateUser = vi.fn();
const mockUseAuth = vi.fn();

vi.stubGlobal("fetch", mockFetch);

vi.mock("@/lib/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("app/dashboard/settings/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: {
        id: "u1",
        email: "jane@example.com",
        name: "Jane Trekker",
        role: "USER",
        phoneNumber: "+91 9876543210",
        gender: "Female",
        age: 29,
        bloodGroup: "O+",
        emergencyContactName: "John",
        emergencyContactNumber: "+91 9123456780",
        emergencyRelationship: "Brother",
        isVerified: true,
        permissions: [],
      },
      mutateUser: mockMutateUser,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  it("renders account settings with prefilled user profile values", () => {
    render(<SettingsPage />);

    expect(
      screen.getByRole("heading", { name: /Account Settings/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue("Jane Trekker");
    expect(screen.getByLabelText(/Phone Number/i)).toHaveValue("9876543210");
    expect(screen.getByLabelText(/Gender/i)).toHaveValue("Female");
  });

  it("submits profile update and calls mutateUser on success", async () => {
    render(<SettingsPage />);

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: "Jane Updated" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save All Changes/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/user/profile",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    const requestInit = mockFetch.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(requestInit.body));
    expect(body.name).toBe("Jane Updated");

    await waitFor(() => {
      expect(
        screen.getByText(/Profile updated successfully!/i),
      ).toBeInTheDocument();
    });
    expect(mockMutateUser).toHaveBeenCalled();
  });

  it("shows validation error when new password is too short", async () => {
    render(<SettingsPage />);

    fireEvent.change(screen.getByLabelText(/Current Password/i), {
      target: { value: "old-password" },
    });
    fireEvent.change(screen.getByLabelText(/New Password/i), {
      target: { value: "123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Update Password/i }));

    expect(
      await screen.findByText(/New password must be at least 6 characters/i),
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalledWith(
      "/api/user/password",
      expect.anything(),
    );
  });
});
