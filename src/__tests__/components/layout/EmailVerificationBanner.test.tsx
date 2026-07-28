import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import EmailVerificationBanner from "@/components/layout/EmailVerificationBanner";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

vi.mock("@/lib/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("EmailVerificationBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    (usePathname as any).mockReturnValue("/dashboard");
    global.fetch = vi.fn();
  });

  it("renders nothing while auth is loading", () => {
    (useAuth as any).mockReturnValue({ user: null, isLoading: true });
    const { container } = render(<EmailVerificationBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a verified user", () => {
    (useAuth as any).mockReturnValue({ user: { isVerified: true }, isLoading: false });
    const { container } = render(<EmailVerificationBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing on excluded routes", () => {
    (usePathname as any).mockReturnValue("/admin/dashboard");
    (useAuth as any).mockReturnValue({ user: { isVerified: false }, isLoading: false });
    const { container } = render(<EmailVerificationBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the prompt for an unverified user and can resend the email", async () => {
    (useAuth as any).mockReturnValue({ user: { isVerified: false }, isLoading: false });
    (global.fetch as any).mockResolvedValue({ ok: true });

    render(<EmailVerificationBanner />);
    expect(screen.getByText("Verify Your Email")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Resend Email"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/resend-verification", { method: "POST" });
    });
    await waitFor(() => {
      expect(screen.getByText(/Verification email sent/)).toBeInTheDocument();
    });
  });

  it("dismisses and stays dismissed for the session", () => {
    (useAuth as any).mockReturnValue({ user: { isVerified: false }, isLoading: false });

    const { unmount } = render(<EmailVerificationBanner />);
    fireEvent.click(screen.getByLabelText("Dismiss email verification alert"));
    expect(screen.queryByText("Verify Your Email")).not.toBeInTheDocument();
    unmount();

    render(<EmailVerificationBanner />);
    expect(screen.queryByText("Verify Your Email")).not.toBeInTheDocument();
  });
});
