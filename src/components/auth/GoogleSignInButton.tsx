"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

interface GoogleSignInButtonProps {
  readonly onCredential: (credential: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GoogleAccountsId = any;

/**
 * Renders Google's own "Sign in with Google" button via the Identity
 * Services script. Hands the resulting credential (ID token) up to the
 * parent, which owns the actual /api/auth/google exchange -- that way the
 * parent can also retry the same credential with a 2FA code if needed,
 * without this component needing to know about that flow.
 */
export default function GoogleSignInButton({ onCredential }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!scriptLoaded || !clientId || !buttonRef.current) return;

    const google = (window as unknown as { google?: { accounts?: { id: GoogleAccountsId } } }).google;
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
