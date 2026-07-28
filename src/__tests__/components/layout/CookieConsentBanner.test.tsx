import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CookieConsentBanner from "@/components/layout/CookieConsentBanner";
import { useRouter } from "next/navigation";
import { COOKIE_CONSENT_COOKIE } from "@/lib/cookie-consent";

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

function clearCookies() {
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0].trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });
}

describe("CookieConsentBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCookies();
    (useRouter as any).mockReturnValue({ refresh: mockRefresh });
  });

  it("shows the banner when no consent cookie exists yet", () => {
    render(<CookieConsentBanner />);
    expect(screen.getByText("Accept All")).toBeInTheDocument();
  });

  it("does not show the banner if a consent cookie already exists", () => {
    document.cookie = `${COOKIE_CONSENT_COOKIE}=accepted; path=/`;
    const { container } = render(<CookieConsentBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("sets an accepted consent cookie and refreshes on Accept All", () => {
    render(<CookieConsentBanner />);
    fireEvent.click(screen.getByText("Accept All"));

    expect(document.cookie).toContain(`${COOKIE_CONSENT_COOKIE}=accepted`);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Accept All")).not.toBeInTheDocument();
  });

  it("sets a rejected consent cookie on Reject Non-Essential", () => {
    render(<CookieConsentBanner />);
    fireEvent.click(screen.getByText("Reject Non-Essential"));

    expect(document.cookie).toContain(`${COOKIE_CONSENT_COOKIE}=rejected`);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
