import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TwoFactorPromptBanner from "@/components/layout/TwoFactorPromptBanner";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

vi.mock("@/lib/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const verifiedCompleteUser = {
  isVerified: true,
  phoneNumber: "+919999999999",
  twoFactorEnabled: false,
};

describe("TwoFactorPromptBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (usePathname as any).mockReturnValue("/dashboard");
  });

  it("renders nothing while loading or logged out", () => {
    (useAuth as any).mockReturnValue({ user: null, isLoading: true });
    const { container } = render(<TwoFactorPromptBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("defers to email verification first", () => {
    (useAuth as any).mockReturnValue({ user: { ...verifiedCompleteUser, isVerified: false }, isLoading: false });
    const { container } = render(<TwoFactorPromptBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("defers to profile completion first", () => {
    (useAuth as any).mockReturnValue({ user: { ...verifiedCompleteUser, phoneNumber: null }, isLoading: false });
    const { container } = render(<TwoFactorPromptBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing once 2FA is already enabled", () => {
    (useAuth as any).mockReturnValue({ user: { ...verifiedCompleteUser, twoFactorEnabled: true }, isLoading: false });
    const { container } = render(<TwoFactorPromptBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the suggestion when verified, profile-complete, and 2FA is off", () => {
    (useAuth as any).mockReturnValue({ user: verifiedCompleteUser, isLoading: false });
    render(<TwoFactorPromptBanner />);
    expect(screen.getByText("Add an Extra Layer of Security")).toBeInTheDocument();
  });

  it("dismisses permanently via localStorage, unlike the session-scoped prompts", () => {
    (useAuth as any).mockReturnValue({ user: verifiedCompleteUser, isLoading: false });

    const { unmount } = render(<TwoFactorPromptBanner />);
    fireEvent.click(screen.getByLabelText("Dismiss two-factor authentication suggestion"));
    expect(screen.queryByText("Add an Extra Layer of Security")).not.toBeInTheDocument();
    unmount();

    expect(localStorage.getItem("dismissedTwoFactorPrompt")).toBe("true");

    render(<TwoFactorPromptBanner />);
    expect(screen.queryByText("Add an Extra Layer of Security")).not.toBeInTheDocument();
  });
});
