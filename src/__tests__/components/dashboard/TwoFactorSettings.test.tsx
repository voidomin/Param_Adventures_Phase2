import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TwoFactorSettings from "@/components/dashboard/TwoFactorSettings";

describe("TwoFactorSettings", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("shows a setup prompt when disabled", () => {
    render(<TwoFactorSettings enabled={false} />);
    expect(screen.getByText("Set Up Two-Factor Authentication")).toBeInTheDocument();
  });

  it("shows the enabled state with a disable option", () => {
    render(<TwoFactorSettings enabled={true} />);
    expect(screen.getByText(/currently/)).toBeInTheDocument();
    expect(screen.getByText("Disable Two-Factor Authentication")).toBeInTheDocument();
  });

  it("walks through setup: fetches secret/backup codes, then confirms with a code", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          secret: "SECRET123",
          provisioningUri: "otpauth://totp/...",
          qrCodeDataUrl: "data:image/png;base64,abc",
          backupCodes: ["AAAA111111", "BBBB222222"],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Two-factor authentication enabled." }),
      });

    render(<TwoFactorSettings enabled={false} />);
    fireEvent.click(screen.getByText("Set Up Two-Factor Authentication"));

    await waitFor(() => {
      expect(screen.getByText("SECRET123")).toBeInTheDocument();
    });
    expect(screen.getByText("AAAA111111")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Enter the 6-digit code/), { target: { value: "123456" } });
    fireEvent.click(screen.getByText("Confirm & Enable"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/user/2fa/verify-setup",
        expect.objectContaining({ method: "POST" }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText(/now enabled/)).toBeInTheDocument();
    });
  });

  it("disables 2FA after confirming with a password", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Two-factor authentication disabled." }),
    });

    render(<TwoFactorSettings enabled={true} />);
    fireEvent.click(screen.getByText("Disable Two-Factor Authentication"));
    fireEvent.change(screen.getByPlaceholderText("Current password"), { target: { value: "mypassword" } });
    fireEvent.click(screen.getByText("Confirm Disable"));

    await waitFor(() => {
      expect(screen.getByText(/disabled/)).toBeInTheDocument();
    });
    expect(screen.getByText("Set Up Two-Factor Authentication")).toBeInTheDocument();
  });

  it("shows an error message when setup fails", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Two-factor authentication is already enabled." }),
    });

    render(<TwoFactorSettings enabled={false} />);
    fireEvent.click(screen.getByText("Set Up Two-Factor Authentication"));

    await waitFor(() => {
      expect(screen.getByText("Two-factor authentication is already enabled.")).toBeInTheDocument();
    });
  });
});
