import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import IntegrationsTab from "@/components/admin/settings/IntegrationsTab";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeProps(values: Record<string, string> = {}) {
  const store = { ...values };
  return {
    getVal: (_type: "PLATFORM" | "SITE", key: string) => store[key] ?? "",
    updateSetting: vi.fn((_type: "PLATFORM" | "SITE", key: string, value: string) => {
      store[key] = value;
    }),
  };
}

describe("components/admin/settings/IntegrationsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("verifies the Google Sign-In client ID via the shared verify endpoint", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: "Client ID recognized by Google." }),
    });

    render(<IntegrationsTab {...makeProps({ google_client_id: "123-abc.apps.googleusercontent.com" })} />);

    const [googleButton] = screen.getAllByRole("button", { name: /Test Connection/i });
    fireEvent.click(googleButton);

    expect(await screen.findByText(/Client ID recognized by Google/i)).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/settings/system/verify",
      expect.objectContaining({
        body: JSON.stringify({ type: "GOOGLE_SIGNIN", config: { clientId: "123-abc.apps.googleusercontent.com" } }),
      }),
    );
  });

  it("shows an error when verifying Google Sign-In without a client ID", async () => {
    render(<IntegrationsTab {...makeProps()} />);

    const [googleButton] = screen.getAllByRole("button", { name: /Test Connection/i });
    fireEvent.click(googleButton);

    expect(await screen.findByText(/enter a Client ID first/i)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("verifies the Turnstile secret key via the shared verify endpoint", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: "Secret Key accepted by Cloudflare." }),
    });

    render(<IntegrationsTab {...makeProps({ turnstile_secret_key: "sk_test" })} />);

    const [, turnstileButton] = screen.getAllByRole("button", { name: /Test Connection/i });
    fireEvent.click(turnstileButton);

    expect(await screen.findByText(/Secret Key accepted by Cloudflare/i)).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/settings/system/verify",
      expect.objectContaining({
        body: JSON.stringify({ type: "TURNSTILE", config: { secretKey: "sk_test" } }),
      }),
    );
  });

  it("surfaces a server-reported error for Turnstile verification", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Cloudflare rejected this Secret Key." }),
    });

    render(<IntegrationsTab {...makeProps({ turnstile_secret_key: "sk_bad" })} />);

    const [, turnstileButton] = screen.getAllByRole("button", { name: /Test Connection/i });
    fireEvent.click(turnstileButton);

    expect(await screen.findByText(/Cloudflare rejected this Secret Key/i)).toBeInTheDocument();
  });
});
