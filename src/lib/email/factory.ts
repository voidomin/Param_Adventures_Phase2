import { prisma } from "@/lib/db";
import { EmailProvider } from "./providers/base";
import { SMTPProvider } from "./providers/smtp";
import { ZohoAPIProvider } from "./providers/zoho-api";
import { ResendProvider } from "./providers/resend";

class EmailFactory {
  /**
   * Resolve the active email provider from the database.
   * Caches configurations briefly or pulls them fresh for high reliability.
   */
  async getProvider(): Promise<{ provider: EmailProvider; from: string }> {
    const settings = await prisma.platformSetting.findMany({
      where: {
        key: {
          in: [
            "email_provider",
            "smtp_host",
            "smtp_port",
            "smtp_user",
            "smtp_pass",
            "smtp_secure",
            "smtp_from",
            "zoho_api_key",
            "resend_api_key",
          ],
        },
      },
    });

    const config = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    const providerType = config.email_provider || "ZOHO_SMTP";
    const from = config.smtp_from || "Param Adventures <booking@paramadventures.in>";

    switch (providerType) {
      case "RESEND": {
        const apiKey = config.resend_api_key || process.env.RESEND_API_KEY;
        if (!apiKey) throw new Error("Resend API Key is missing (checked Platform Settings and Environment).");
        return { 
          provider: new ResendProvider({ apiKey }), 
          from 
        };
      }

      case "ZOHO_API": {
        const apiKey = config.zoho_api_key || process.env.ZOHO_API_KEY;
        if (!apiKey) throw new Error("Zoho API Key is missing (checked Platform Settings and Environment).");
        return { 
          provider: new ZohoAPIProvider({ apiKey }), 
          from 
        };
      }

      case "ZOHO_SMTP":
      default: {
        const host = config.smtp_host || "smtp.zoho.com";
        const port = Number.parseInt(config.smtp_port || "465", 10);
        const secure = config.smtp_secure !== undefined 
          ? config.smtp_secure === "true" 
          : port === 465;

        console.log(`[EmailFactory] Initializing SMTP: ${host}:${port} (Secure: ${secure})`);

        return {
          provider: new SMTPProvider({
            host,
            port,
            user: config.smtp_user,
            pass: config.smtp_pass,
            secure,
          }),
          from
        };
      }
    }
  }
}

export const emailFactory = new EmailFactory();
