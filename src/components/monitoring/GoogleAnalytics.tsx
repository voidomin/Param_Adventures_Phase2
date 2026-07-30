import React, { Suspense } from 'react';
import Script from 'next/script';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { withBuildSafety } from '@/lib/db-utils';
import { COOKIE_CONSENT_COOKIE, COOKIE_CONSENT_ACCEPTED } from '@/lib/cookie-consent';
import GoogleAnalyticsTracker from './GoogleAnalyticsTracker';

export default async function GoogleAnalytics() {
  const cookieStore = await cookies();
  if (cookieStore.get(COOKIE_CONSENT_COOKIE)?.value !== COOKIE_CONSENT_ACCEPTED) {
    return null;
  }

  const gaSetting = await withBuildSafety(() =>
    prisma.platformSetting.findUnique({
      where: { key: 'google_analytics_id' },
    }), null
  );

  const gaEnabledSetting = await withBuildSafety(() =>
    prisma.platformSetting.findUnique({
      where: { key: 'google_analytics_enabled' },
    }), null
  );

  const measurementId = gaSetting?.value;
  const isEnabled = gaEnabledSetting?.value !== 'false'; // Default to true

  if (!measurementId?.startsWith('G-') || !isEnabled) {
    return null;
  }

  return (
    <>
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
          });
        `}
      </Script>
      {/* 
          Suspense is required here because useSearchParams() in the tracker
          triggers a dynamic search params check in Next.js 14/15.
      */}
      <Suspense fallback={null}>
        <GoogleAnalyticsTracker measurementId={measurementId} />
      </Suspense>
    </>
  );
}
