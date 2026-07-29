import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SecurityTab from "@/components/admin/settings/SecurityTab";

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

describe("components/admin/settings/SecurityTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checks the admin's current access against the in-progress IP allowlist", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: "Your current IP (1.2.3.4) is allowed. Safe to save." }),
    });

    render(<SecurityTab {...makeProps({ admin_ip_allowlist: "1.2.3.4" })} />);

    fireEvent.click(screen.getByRole("button", { name: /Check My Access/i }));

    await waitFor(() => expect(screen.getByText(/Safe to save/i)).toBeInTheDocument());
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/settings/system/verify",
      expect.objectContaining({
        body: JSON.stringify({ type: "ADMIN_IP_ALLOWLIST", config: { allowlist: "1.2.3.4" } }),
      }),
    );
  });

  it("surfaces the self-lockout warning when the current IP isn't in the list", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Your current IP (9.9.9.9) is NOT in this list. Saving it as-is would lock out your own access." }),
    });

    render(<SecurityTab {...makeProps({ admin_ip_allowlist: "1.2.3.4" })} />);

    fireEvent.click(screen.getByRole("button", { name: /Check My Access/i }));

    await waitFor(() => expect(screen.getByText(/lock out your own access/i)).toBeInTheDocument());
  });
});
