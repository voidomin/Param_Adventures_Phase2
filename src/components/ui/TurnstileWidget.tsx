"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

interface TurnstileWidgetProps {
  readonly onVerify: (token: string) => void;
}

export default function TurnstileWidget({ onVerify }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [siteKey, setSiteKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/public")
      .then((res) => res.json())
      .then((data) => {
         
        setSiteKey(data.turnstile_site_key || null);
      })
      .catch(() => setSiteKey(null));
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !siteKey || !containerRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const turnstile = (window as unknown as { turnstile?: any }).turnstile;
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
