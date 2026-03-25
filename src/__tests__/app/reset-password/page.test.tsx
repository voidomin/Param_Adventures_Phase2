import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ResetPasswordPage from "@/app/reset-password/page";

const mockPush = vi.fn();
const mockGet = vi.fn();
const mockFetch = vi.fn();

vi.stubGlobal("fetch", mockFetch);

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockGet }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, ...rest }: any) => <img src={src} alt={alt} {...rest} />,
}));

describe("app/reset-password/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows token error when token is missing", async () => {
    mockGet.mockReturnValue(null);

    render(<ResetPasswordPage />);

    const submitBtn = screen.getByRole("button", { name: "Reset Password" });
    expect(submitBtn).toBeDisabled();

    fireEvent.click(submitBtn);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("resets password and redirects to login", async () => {
    mockGet.mockReturnValue("token-abc");
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Password updated successfully" }),
    });

    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/reset-password",
        expect.objectContaining({ method: "POST" }),
      );
      expect(screen.getByText("Password updated successfully")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    }, { timeout: 3500 });
  });
});
