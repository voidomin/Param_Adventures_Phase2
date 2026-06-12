import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const scriptSrcPolicy = [
  "'self'",
  "'unsafe-inline'",
  isProd ? "" : "'unsafe-eval'",
  "https://www.youtube.com",
  "https://s.ytimg.com",
  "https://checkout.razorpay.com",
  "https://www.googletagmanager.com",
].filter(Boolean).join(" ");

const extraDomains: string[] = [];
if (process.env.NEXT_PUBLIC_CDN_URL) {
  try {
    extraDomains.push(new URL(process.env.NEXT_PUBLIC_CDN_URL).hostname);
  } catch {}
}
if (process.env.NEXT_PUBLIC_CDN_DOMAIN) {
  extraDomains.push(process.env.NEXT_PUBLIC_CDN_DOMAIN);
}

const allowedHosts = ["*.amazonaws.com", ...extraDomains];
const allowedHostsStr = allowedHosts.map(h => `https://${h}`).join(" ");

const nextConfig: NextConfig = {
  cacheMaxMemorySize: 50 * 1024 * 1024, // 50MB in-memory cache limit (essential for 512MB RAM limit on Render)
  experimental: {
    webpackBuildWorker: true, // run webpack builds in a separate worker to limit memory usage
  },
  images: {
    qualities: [75, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
      },
      ...extraDomains.map(domain => ({
        protocol: "https" as const,
        hostname: domain,
      })),
    ],
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          {
            key: "Access-Control-Allow-Origin",
            value:
              process.env.NODE_ENV === "production"
                ? process.env.NEXT_PUBLIC_APP_URL || ""
                : "*",
          }, // Restricted to App URL in production
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,DELETE,PATCH,POST,PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src ${scriptSrcPolicy}`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              `img-src 'self' data: blob: https://res.cloudinary.com https://picsum.photos https://images.unsplash.com https://lh3.googleusercontent.com https://checkout.razorpay.com https://www.google-analytics.com ${allowedHostsStr}`,
              "font-src 'self' https://fonts.gstatic.com",
              `connect-src 'self' https://res.cloudinary.com https://api.cloudinary.com https://api.razorpay.com https://lumberjack.razorpay.com https://*.sentry.io https://www.google-analytics.com ${allowedHostsStr}`,
              "frame-src 'self' https://www.youtube.com https://api.razorpay.com https://checkout.razorpay.com",
              `media-src 'self' https://res.cloudinary.com ${allowedHostsStr}`,
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

import { withSentryConfig } from "@sentry/nextjs";

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-javascript/blob/master/packages/nextjs/src/config/types.ts

  // Suppresses source map uploading logs during bundling
  silent: true,
  org: "param-adventures",
  project: "javascript-nextjs",
  // Source map upload auth token
  authToken: process.env.SENTRY_AUTH_TOKEN,

  sourcemaps: {
    // Automatically delete source maps after uploading to Sentry
    deleteSourcemapsAfterUpload: true,
  },

  // [STABILIZATION FIX] Disabling tunnelRoute to break the infinite /monitoring auth loop.
  // Routes HTTP requests through Sentry's tunnel endpoint to avoid ad-blockers
  // tunnelRoute: "/monitoring",
});
