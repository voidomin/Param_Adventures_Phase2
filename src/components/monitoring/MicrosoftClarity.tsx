import React from 'react';
import Script from 'next/script';
import { prisma } from '@/lib/db';
import { withBuildSafety } from '@/lib/db-utils';

export default async function MicrosoftClarity() {
  const clarityIdSetting = await withBuildSafety(() =>
    prisma.platformSetting.findUnique({
      where: { key: 'microsoft_clarity_id' },
    }), null
  );

  const clarityEnabledSetting = await withBuildSafety(() =>
    prisma.platformSetting.findUnique({
      where: { key: 'microsoft_clarity_enabled' },
    }), null
  );

  const clarityId = clarityIdSetting?.value;
  const isEnabled = clarityEnabledSetting?.value === 'true';

  if (!clarityId || !isEnabled) {
    return null;
  }

  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`
        (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${clarityId}");
      `}
    </Script>
  );
}
