"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * GoogleAnalyticsTracker
 * This is a client component that listens to route changes and reports them
 * to Google Analytics. It fixes the "0 visitors" bug in Next.js SPAs.
 */
export default function GoogleAnalyticsTracker({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!measurementId || !globalThis.window?.gtag) return;

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    
    // Trigger the page_view manually for every route transition
    globalThis.window.gtag("config", measurementId, {
      page_path: url,
    });
  }, [pathname, searchParams, measurementId]);

  return null;
}

// Add global type for gtag
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (command: string, ...args: unknown[]) => void;
  }
}
