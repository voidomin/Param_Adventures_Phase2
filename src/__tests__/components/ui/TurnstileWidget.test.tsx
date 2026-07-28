import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import TurnstileWidget from "@/components/ui/TurnstileWidget";

vi.mock("next/script", () => ({
  default: ({ onLoad }: { onLoad?: () => void }) => {
    onLoad?.();
    return null;
  },
}));

describe("TurnstileWidget", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
     
    delete (window as any).turnstile;
  });

  it("renders nothing when the public settings endpoint has no site key", async () => {
    (global.fetch as any).mockResolvedValue({ json: async () => ({ turnstile_site_key: "" }) });

    const { container } = render(<TurnstileWidget onVerify={vi.fn()} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/settings/public"));
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the challenge with the fetched site key and forwards the verified token", async () => {
    (global.fetch as any).mockResolvedValue({ json: async () => ({ turnstile_site_key: "fetched-site-key" }) });
    const onVerify = vi.fn();
    let capturedCallback: ((token: string) => void) | undefined;
     
    (window as any).turnstile = {
      render: (_el: HTMLElement, opts: any) => {
        capturedCallback = opts.callback;
      },
    };

    render(<TurnstileWidget onVerify={onVerify} />);
    await waitFor(() => expect(capturedCallback).toBeDefined());
    capturedCallback?.("verified-token");

    expect(onVerify).toHaveBeenCalledWith("verified-token");
  });

  it("renders nothing if the settings fetch fails", async () => {
    (global.fetch as any).mockRejectedValue(new Error("network error"));

    const { container } = render(<TurnstileWidget onVerify={vi.fn()} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
