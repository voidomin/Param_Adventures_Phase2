import { NextRequest, NextResponse } from "next/server";
import { authorizeSystemRequest } from "@/lib/api-auth";
import { emailFactory } from "@/lib/email/factory";
import { render } from "@react-email/render";
import WelcomeEmail from "@/components/emails/WelcomeEmail";
import React from "react";

/**
 * POST /api/admin/settings/system/test-email
 * Sends a test email to the specified address using the currently SAVED settings in the DB.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeSystemRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const { to } = await request.json();
    if (!to) {
      return NextResponse.json({ error: "Recipient email is required." }, { status: 400 });
    }

    // Resolve the current provider from the DB
    const { provider, from } = await emailFactory.getProvider();

    // Render a simple template for the test
    const html = await render(
      <WelcomeEmail 
        userName="Admin Tester" 
      />
    );

    await provider.send({
      to,
      subject: "🏔️ Param Adventures: Email Configuration Test",
      html,
      from
    });

    return NextResponse.json({ message: "Test email sent successfully!" });
  } catch (error: any) {
    console.error("Test email error:", error);
    return NextResponse.json(
      { error: `Failed to send test email: ${error.message || "Unknown error"}` },
      { status: 500 },
    );
  }
}
