import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CommunicationsTab from "@/components/admin/settings/CommunicationsTab";

function makeProps(values: Record<string, string> = {}) {
  const store = { ...values };
  return {
    getVal: (_type: "PLATFORM" | "SITE", key: string) => store[key] ?? "",
    updateSetting: vi.fn((_type: "PLATFORM" | "SITE", key: string, value: string) => {
      store[key] = value;
    }),
  };
}

describe("components/admin/settings/CommunicationsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a no-events-yet message when Resend is selected but no webhook has ever fired", () => {
    render(<CommunicationsTab {...makeProps({ email_provider: "RESEND" })} />);

    expect(screen.getByText(/No webhook events received yet/i)).toBeInTheDocument();
  });

  it("shows the last-received timestamp once a webhook event has been recorded", () => {
    const timestamp = "2026-01-15T10:30:00.000Z";
    render(
      <CommunicationsTab
        {...makeProps({ email_provider: "RESEND", resend_webhook_last_event_at: timestamp })}
      />,
    );

    expect(screen.getByText(/Last webhook event received:/i)).toBeInTheDocument();
  });

  it("doesn't render webhook status for non-Resend providers", () => {
    render(<CommunicationsTab {...makeProps({ email_provider: "ZOHO_API" })} />);

    expect(screen.queryByText(/webhook event/i)).not.toBeInTheDocument();
  });
});
