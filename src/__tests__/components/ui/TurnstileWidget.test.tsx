import { render } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import TurnstileWidget from "@/components/ui/TurnstileWidget";

vi.mock("next/script", () => ({
  default: ({ onLoad }: { onLoad?: () => void }) => {
    onLoad?.();
    return null;
  },
}));

describe("TurnstileWidget", () => {
  const originalEnv = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  afterEach(() => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = originalEnv;
     
    delete (window as any).turnstile;
  });

  it("renders nothing when no site key is configured", () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "";
    const { container } = render(<TurnstileWidget onVerify={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the challenge and forwards the verified token", () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "test-site-key";
    const onVerify = vi.fn();
    let capturedCallback: ((token: string) => void) | undefined;
     
    (window as any).turnstile = {
      render: (_el: HTMLElement, opts: any) => {
        capturedCallback = opts.callback;
      },
    };

    render(<TurnstileWidget onVerify={onVerify} />);
    capturedCallback?.("verified-token");

    expect(onVerify).toHaveBeenCalledWith("verified-token");
  });
});
