import { NextResponse, NextRequest } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import * as Sentry from "@sentry/nextjs";
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

    // Trigger a heartbeat message to Sentry
    // We send a direct message which works even if the default SDK isn't fully initialized with this DSN yet
    Sentry.captureMessage("Sentry Verification Heartbeat - Param Adventures Command Center", {
      level: "info",
      tags: {
        type: "verification",
        source: "admin-dashboard"
      },
      extra: {
        requestedBy: auth.userId,
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Verification heartbeat sent to Sentry. Please check your Sentry dashboard issues list." 
    });
  } catch (error: unknown) {
    console.error("Sentry verify error:", error);
    return NextResponse.json(
      { error: "Failed to send verification heartbeat" },
      { status: 500 },
    );
  }
}
