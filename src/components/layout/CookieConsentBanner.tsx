"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cookie } from "lucide-react";
import {
  COOKIE_CONSENT_COOKIE,
  COOKIE_CONSENT_ACCEPTED,
  COOKIE_CONSENT_REJECTED,
  COOKIE_CONSENT_MAX_AGE_SECONDS,
} from "@/lib/cookie-consent";

function hasExistingConsentCookie(): boolean {
  return document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE_CONSENT_COOKIE}=`));
}

/**
 * Analytics scripts (Google Analytics, Meta Pixel, Microsoft Clarity) are
 * server components that gate themselves on this cookie -- see
 * src/lib/cookie-consent.ts. Setting it here and calling router.refresh()
 * re-runs those server components with the new cookie value without a full
 * page reload.
 */
export default function CookieConsentBanner() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!hasExistingConsentCookie()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) return null;

  const setConsent = (value: string) => {
    document.cookie = `${COOKIE_CONSENT_COOKIE}=${value}; path=/; max-age=${COOKIE_CONSENT_MAX_AGE_SECONDS}; SameSite=Lax`;
    setIsVisible(false);
    router.refresh();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-card border-t border-border shadow-2xl">
      <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Cookie className="w-5 h-5 text-primary shrink-0" />
          <p className="text-xs sm:text-sm text-foreground/70 leading-relaxed">
            We use cookies for essential site functionality and, with your consent, for analytics to
            understand how the site is used. See our{" "}
            <Link href="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </Link>{" "}
            for details.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setConsent(COOKIE_CONSENT_REJECTED)}
            className="text-xs sm:text-sm font-bold text-foreground/60 hover:text-foreground px-4 py-2 transition-colors"
          >
            Reject Non-Essential
          </button>
          <button
            type="button"
            onClick={() => setConsent(COOKIE_CONSENT_ACCEPTED)}
            className="text-xs sm:text-sm font-bold bg-primary text-primary-foreground px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
