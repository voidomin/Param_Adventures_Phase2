import React from 'react';
import Script from 'next/script';
import { prisma } from '@/lib/db';

/**
 * GoogleAnalytics Component
 * Dynamically injects the GA4 tracking script if a Measurement ID is found in the database.
 * This is a server component by default in Next.js 14+ layouts.
 */
export default async function GoogleAnalytics() {
  // Fetch the current Measurement ID from the Platform Settings
  const gaSetting = await prisma.platformSetting.findUnique({
    where: { key: 'google_analytics_id' },
  });

  const measurementId = gaSetting?.value;

  // Only inject if the ID is valid and starts with 'G-'
  if (!measurementId || !measurementId.startsWith('G-')) {
    return null;
  }

  return (
    <>
      {/* Global Site Tag (gtag.js) */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            page_path: window.location.pathname,
            debug_mode: true
          });
        `}
      </Script>
    </>
  );
}
