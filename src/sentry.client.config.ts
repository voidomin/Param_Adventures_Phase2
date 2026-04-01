import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://examplePublicKey@o0.ingest.sentry.io/0",

  // Replay is only available in the client
  integrations: [
    Sentry.replayIntegration(),
  ],

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,

  // Performance Monitoring
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
