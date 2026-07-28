import { render } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

vi.mock("next/script", () => ({
  default: ({ onLoad }: { onLoad?: () => void }) => {
    onLoad?.();
    return null;
  },
}));

describe("GoogleSignInButton", () => {
  const originalEnv = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  afterEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = originalEnv;
     
    delete (window as any).google;
  });

  it("renders nothing when no client ID is configured", () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "";
    const { container } = render(<GoogleSignInButton onCredential={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("initializes Google Identity Services and renders the button once the script loads", () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "test-client-id";
    const initialize = vi.fn();
    const renderButton = vi.fn();
     
    (window as any).google = { accounts: { id: { initialize, renderButton } } };

    render(<GoogleSignInButton onCredential={vi.fn()} />);

    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: "test-client-id" }),
    );
    expect(renderButton).toHaveBeenCalled();
  });

  it("forwards the credential from Google's callback to onCredential", () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "test-client-id";
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
    capturedCallback?.({ credential: "id-token-123" });

    expect(onCredential).toHaveBeenCalledWith("id-token-123");
  });
});
