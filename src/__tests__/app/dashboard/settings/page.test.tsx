import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsPage from "@/app/dashboard/settings/page";

const mockFetch = vi.fn();
const mockMutateUser = vi.fn();
const mockUseAuth = vi.fn();
const mockLogout = vi.fn();

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
        dateOfBirth: "1997-03-26",
        bloodGroup: "O+",
        emergencyContactName: "John",
        emergencyContactNumber: "+91 9123456780",
        emergencyRelationship: "Brother",
        isVerified: true,
        permissions: [],
      },
      mutateUser: mockMutateUser,
      logout: mockLogout,
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

  it("shows a Verified badge and no resend button when the account is verified", () => {
    render(<SettingsPage />);

    expect(screen.getByText(/^Verified$/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /resend verification email/i })).not.toBeInTheDocument();
  });

  it("shows a Not verified badge and a resend button when the account is unverified", async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "u1",
        email: "jane@example.com",
        name: "Jane Trekker",
        role: "USER",
        phoneNumber: "+91 9876543210",
        gender: "Female",
        age: 29,
        dateOfBirth: "1997-03-26",
        bloodGroup: "O+",
        emergencyContactName: "John",
        emergencyContactNumber: "+91 9123456780",
        emergencyRelationship: "Brother",
        isVerified: false,
        permissions: [],
      },
      mutateUser: mockMutateUser,
      logout: mockLogout,
    });

    render(<SettingsPage />);

    expect(screen.getByText(/not verified/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /resend verification email/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/auth/resend-verification", { method: "POST" });
    });
    expect(await screen.findByText(/verification email sent/i)).toBeInTheDocument();
  });

  it("shows an error when resending the verification email fails", async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "u1",
        email: "jane@example.com",
        name: "Jane Trekker",
        role: "USER",
        isVerified: false,
        permissions: [],
      },
      mutateUser: mockMutateUser,
      logout: mockLogout,
    });
    mockFetch.mockResolvedValue({ ok: false });

    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /resend verification email/i }));

    expect(await screen.findByText(/couldn.t send/i)).toBeInTheDocument();
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

  it("downloads data export when 'Download My Data' is clicked", async () => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ profile: {}, bookings: [] }),
    });

    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Download My Data/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/user/data-export");
    });
  });

  it("disables the delete-account submit button until DELETE is typed", async () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: /^Delete My Account$/i }));

    const submitBtn = screen.getByRole("button", { name: /^Delete Account$/i });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Type DELETE to confirm/i), {
      target: { value: "DELETE" },
    });

    expect(submitBtn).not.toBeDisabled();
  });

  it("submits account deletion, logs out, and redirects on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Your account has been deleted." }),
    });

    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /^Delete My Account$/i }));

    fireEvent.change(screen.getByLabelText(/Confirm your password/i), {
      target: { value: "mypassword" },
    });
    fireEvent.change(screen.getByLabelText(/Type DELETE to confirm/i), {
      target: { value: "DELETE" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Delete Account$/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/user/delete-account",
        expect.objectContaining({ method: "POST" }),
      );
    });
    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });
  });
});
