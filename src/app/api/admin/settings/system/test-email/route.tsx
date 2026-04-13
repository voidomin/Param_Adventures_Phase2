import { NextRequest, NextResponse } from "next/server";
import { authorizeSystemRequest } from "@/lib/api-auth";
import { emailFactory } from "@/lib/email/factory";
import { render } from "@react-email/render";
import WelcomeEmail from "@/components/emails/WelcomeEmail";
import React from "react";

// Move the template rendering out of the try/catch handler to satisfy strict JSX linting.
const renderTestEmail = async (userName: string) => {
  const element = <WelcomeEmail userName={userName} />;
  return render(element);
};

/**
 * POST /api/admin/settings/system/test-email
 * Sends a test email to the specified address using the currently SAVED settings in the DB.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeSystemRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const { to, config: overrideConfig } = await request.json();
    if (!to) {
      return NextResponse.json({ error: "Recipient email is required." }, { status: 400 });
    }

    // Resolve the provider, optionally using temporary overrides from the frontend
    const { provider, from } = await emailFactory.getProvider(overrideConfig);

    // Render the template using the safe helper
    const html = await renderTestEmail("Admin Configuration Tester");

    const configSource = (overrideConfig && Object.keys(overrideConfig).length > 0) ? "TEMPORARY (Dashboard Overrides)" : "SAVED (Database)";
    console.log(`[TestEmail] Sending test to ${to} using ${configSource}...`);
    if (configSource === "TEMPORARY (Dashboard Overrides)") {
      console.log(`[TestEmail] Overrides received: ${Object.keys(overrideConfig || {}).join(", ")}`);
    }
    
    await provider.send({
      to,
      subject: "🏔️ Param Adventures: Email Configuration Test",
      html,
      from
    });

    return NextResponse.json({ message: "Test email sent successfully! Everything is wired correctly. 🚀" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Test email error details:", error);
    return NextResponse.json(
      { error: `Failed to send test email: ${message}` },
      { status: 500 },
    );
  }
}
