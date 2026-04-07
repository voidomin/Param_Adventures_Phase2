"use client";

import { SMTPProvider } from "../lib/email/providers/smtp";
import { ResendProvider } from "../lib/email/providers/resend";
import * as dotenv from "dotenv";
import path from "node:path";

// Force load all environment files
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function runPureDiagnostic() {
  const recipient = process.argv[2] || "akashkbhat216@gmail.com";
  const from = "Param Adventures <booking@paramadventures.in>";
  
  console.log("🚀 Starting Pure Email Connection Diagnostic (Bypassing Database)...\n");

  // --- ZOHO SMTP (Port 587 / STARTTLS) ---
  console.log("--- [1/2] TESTING ZOHO SMTP (PORT 587) ---");
  try {
    const user = process.env.SMTP_USER || "booking@paramadventures.in";
    const pass = process.env.SMTP_PASS;

    if (pass) {
      console.log(`Connecting to smtp.zoho.in:587 as ${user}...`);
      const provider = new SMTPProvider({
        host: "smtp.zoho.in",
        port: 587,
        user,
        pass,
        secure: false // Meaning STARTTLS
      });

      await provider.send({
        to: recipient,
        subject: "🏔️ Diagnostic: Pure Zoho SMTP Test (Port 587)",
        html: "<h1>Success!</h1><p>The Zoho SMTP connection is working perfectly on Port 587 via terminal diagnostic.</p>",
        from
      });
      console.log(`✅ Success! Zoho email sent to ${recipient}\n`);
    } else {
      console.log("⚠️ Skipping Zoho: SMTP_PASS not found in .env.local\n");
    }
  } catch (err: any) {
    console.error(`❌ Zoho SMTP Failed: ${err.message}\n`);
  }

  // --- RESEND API ---
  console.log("--- [2/2] TESTING RESEND API ---");
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      console.log("Connecting to Resend API...");
      const provider = new ResendProvider({ apiKey: resendApiKey });

      await provider.send({
        to: recipient,
        subject: "🏔️ Diagnostic: Pure Resend API Test",
        html: "<h1>Success!</h1><p>The Resend API connection is working perfectly via terminal diagnostic.</p>",
        from
      });
      console.log(`✅ Success! Resend email sent to ${recipient}\n`);
    } else {
      console.log("⚠️ Skipping Resend: RESEND_API_KEY not found in .env.local\n");
    }
  } catch (err: any) {
    console.error(`❌ Resend Failed: ${err.message}\n`);
  }

  console.log("🎯 Pure Diagnostic Complete.");
  process.exit(0);
}

runPureDiagnostic().catch((e) => {
  console.error(e);
  process.exit(1);
});
