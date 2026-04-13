import React from 'react';
import Script from 'next/script';
import { prisma } from '@/lib/db';
import { withBuildSafety } from '@/lib/db-utils';

export default async function MetaPixel() {
  const pixelIdSetting = await withBuildSafety(() =>
    prisma.platformSetting.findUnique({
      where: { key: 'meta_pixel_id' },
    }), null
  );

  const pixelEnabledSetting = await withBuildSafety(() =>
    prisma.platformSetting.findUnique({
      where: { key: 'meta_pixel_enabled' },
    }), null
  );

  const pixelId = pixelIdSetting?.value;
  const isEnabled = pixelEnabledSetting?.value === 'true';

  if (!pixelId || !isEnabled) {
    return null;
  }

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          height="1" 
          width="1" 
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
