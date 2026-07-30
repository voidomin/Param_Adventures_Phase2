"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

interface GoogleSignInButtonProps {
  readonly onCredential: (credential: string) => void;
}

export default function GoogleSignInButton({ onCredential }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/public")
      .then((res) => res.json())
      .then((data) => {
         
        setClientId(data.google_client_id || null);
      })
      .catch(() => setClientId(null));
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !clientId || !buttonRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as unknown as { google?: { accounts?: { id: any } } }).google;
    if (!google?.accounts?.id) return;

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: { credential: string }) => onCredential(response.credential),
    });

    google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: 320,
      text: "continue_with",
    });
  }, [scriptLoaded, clientId, onCredential]);

  if (!clientId) return null;

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <div ref={buttonRef} className="flex justify-center" />
    </>
  );
}
