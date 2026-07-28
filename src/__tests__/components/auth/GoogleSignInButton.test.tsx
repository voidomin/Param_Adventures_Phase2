import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

vi.mock("next/script", () => ({
  default: ({ onLoad }: { onLoad?: () => void }) => {
    onLoad?.();
    return null;
  },
}));

describe("GoogleSignInButton", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
     
    delete (window as any).google;
  });

  it("renders nothing when the public settings endpoint has no client ID", async () => {
    (global.fetch as any).mockResolvedValue({ json: async () => ({ google_client_id: "" }) });

    const { container } = render(<GoogleSignInButton onCredential={vi.fn()} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/settings/public"));
    expect(container).toBeEmptyDOMElement();
  });

  it("initializes Google Identity Services with the fetched client ID once the script loads", async () => {
    (global.fetch as any).mockResolvedValue({ json: async () => ({ google_client_id: "fetched-client-id" }) });
    const initialize = vi.fn();
    const renderButton = vi.fn();
     
    (window as any).google = { accounts: { id: { initialize, renderButton } } };

    render(<GoogleSignInButton onCredential={vi.fn()} />);

    await waitFor(() => {
      expect(initialize).toHaveBeenCalledWith(
        expect.objectContaining({ client_id: "fetched-client-id" }),
      );
    });
    expect(renderButton).toHaveBeenCalled();
  });

  it("forwards the credential from Google's callback to onCredential", async () => {
    (global.fetch as any).mockResolvedValue({ json: async () => ({ google_client_id: "fetched-client-id" }) });
    const onCredential = vi.fn();
    let capturedCallback: ((response: { credential: string }) => void) | undefined;
     
    (window as any).google = {
      accounts: {
        id: {
          initialize: (opts: any) => {
            capturedCallback = opts.callback;
          },
          renderButton: vi.fn(),
        },
      },
    };

    render(<GoogleSignInButton onCredential={onCredential} />);
    await waitFor(() => expect(capturedCallback).toBeDefined());
    capturedCallback?.({ credential: "id-token-123" });

    expect(onCredential).toHaveBeenCalledWith("id-token-123");
  });

  it("renders nothing if the settings fetch fails", async () => {
    (global.fetch as any).mockRejectedValue(new Error("network error"));

    const { container } = render(<GoogleSignInButton onCredential={vi.fn()} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
