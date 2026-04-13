import { NextResponse, NextRequest } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { isSentryEnabled } from "@/lib/monitoring";

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeRequest(request, ["system:config"]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const enabled = await isSentryEnabled();
    if (!enabled) {
      return NextResponse.json({ 
        error: "Sentry is currently DISABLED in the Command Center. Please enable it and click 'Apply Changes' before testing the connection." 
      }, { status: 400 });
    }

    const { dsn } = await request.json();

    if (!dsn) {
      return NextResponse.json({ error: "DSN is required" }, { status: 400 });
    }

    // Low-level Sentry Heartbeat via Fetch
    // This bypasses the Sentry 10 SDK initialization limits and works even if
    // NEXT_PUBLIC_SENTRY_DSN is missing from the environment.
    try {
      const dsnUrl = new URL(dsn);

      // SSRF hardening: only allow known Sentry ingestion hosts over HTTPS.
      if (dsnUrl.protocol !== "https:") {
        return NextResponse.json({ error: "Invalid DSN protocol" }, { status: 400 });
      }

      const hostname = dsnUrl.hostname.toLowerCase();
      const isAllowedSentryHost =
        hostname === "sentry.io" || hostname.endsWith(".sentry.io");

      if (!isAllowedSentryHost) {
        return NextResponse.json({ error: "Invalid DSN host" }, { status: 400 });
      }

      const projectId = dsnUrl.pathname.replace(/^\/+/, "");
      const publicKey = dsnUrl.username;

      if (!/^\d+$/.test(projectId) || !publicKey) {
        return NextResponse.json({ error: "Invalid DSN format" }, { status: 400 });
      }

      const storeUrl = new URL(`/api/${projectId}/store/`, dsnUrl.origin).toString();
      const authHeader = `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=param-adventures-admin/1.0.0`;

      const sentryRes = await fetch(storeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sentry-Auth": authHeader,
        },
        body: JSON.stringify({
          message: "Sentry Verification Heartbeat - Param Adventures Command Center",
          level: "info",
          tags: {
            type: "verification",
            source: "admin-dashboard",
            environment: process.env.NODE_ENV,
            platform: "render"
          },
          extra: {
            requestedBy: auth.userId,
            timestamp: new Date().toISOString()
          }
        }),
      });

      if (!sentryRes.ok) {
        const errText = await sentryRes.text();
        console.error("Sentry heartbeat failed:", errText);
        return NextResponse.json({ error: `Sentry server rejected the heartbeat: ${sentryRes.status}` }, { status: 502 });
      }

      return NextResponse.json({ 
        success: true, 
        message: "Verification heartbeat sent! If this arrives in Sentry, your DSN and networking are healthy." 
      });

    } catch (e) {
      console.error("[SENTRY] DSN parsing error:", e);
      return NextResponse.json({ error: "Invalid DSN format" }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error("Sentry verify error:", error);
    return NextResponse.json(
      { error: "Failed to send verification heartbeat" },
      { status: 500 },
    );
  }
}
