import * as Sentry from "@sentry/nextjs";
import { isSentryEnabled } from "@/lib/monitoring";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://examplePublicKey@o0.ingest.sentry.io/0",

  // 10% sample rate in production, 100% in development -- matches the
  // client config's already-correct split (instrumentation-client.ts).
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

  // Forwards console.error calls to Sentry, so the many API routes that
  // only console.error a caught failure (never call logError()/Sentry
  // directly) still surface here instead of only in ephemeral server logs.
  integrations: [Sentry.captureConsoleIntegration({ levels: ["error"] })],

  // Respects the same admin-configurable "sentry_enabled" DB kill switch
  // that logError() already honors, so console-captured events don't
  // bypass it.
  beforeSend: async (event) => ((await isSentryEnabled()) ? event : null),

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
