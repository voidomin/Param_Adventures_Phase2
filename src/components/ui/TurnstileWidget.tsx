"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

interface TurnstileWidgetProps {
  readonly onVerify: (token: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TurnstileApi = any;

/**
 * Renders a Cloudflare Turnstile challenge. Renders nothing (and the caller
 * proceeds without a token) if no site key is configured -- CAPTCHA is
 * opt-in, not required, matching the rest of this app's optional-hardening
 * features.
 */
export default function TurnstileWidget({ onVerify }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!scriptLoaded || !siteKey || !containerRef.current) return;

    const turnstile = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
    if (!turnstile) return;

    turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token: string) => onVerify(token),
    });
  }, [scriptLoaded, siteKey, onVerify]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <div ref={containerRef} />
    </>
  );
}
