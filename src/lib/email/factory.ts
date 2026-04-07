import { prisma } from "@/lib/db";
import { EmailProvider } from "./providers/base";
import { SMTPProvider } from "./providers/smtp";
import { ZohoAPIProvider } from "./providers/zoho-api";
import { ResendProvider } from "./providers/resend";

class EmailFactory {
  /**
   * Resolve the active email provider from the database.
   */
  async getProvider(overrideConfig?: Record<string, string>): Promise<{ provider: EmailProvider; from: string }> {
    const config = await this.fetchResolvedConfig(overrideConfig);
    const type = config.email_provider || "ZOHO_SMTP";
    const from = config.smtp_from || "Param Adventures <booking@paramadventures.in>";

    switch (type) {
      case "RESEND":
        return this.initResend(config, from);
      case "ZOHO_API":
        return this.initZoho(config, from);
      default:
        return this.initSMTP(config, from);
    }
  }

  private async fetchResolvedConfig(overrideConfig?: Record<string, string>): Promise<Record<string, string>> {
    const keys = [
      "email_provider", "smtp_host", "smtp_port", "smtp_user", 
      "smtp_pass", "smtp_secure", "smtp_from", "zoho_api_key", "resend_api_key"
    ];
    
    const settings = await prisma.platformSetting.findMany({
      where: { key: { in: keys } },
    });

    return {
      ...Object.fromEntries(settings.map((s) => [s.key, s.value])),
      ...overrideConfig
    };
  }

  private initResend(config: Record<string, string>, from: string) {
    const key = this.scrub(config.resend_api_key) || process.env.RESEND_API_KEY || "";
    if (!key) throw new Error("Resend API Key is missing.");
    return { provider: new ResendProvider({ apiKey: key }), from };
  }

  private initZoho(config: Record<string, string>, from: string) {
    const key = this.scrub(config.zoho_api_key) || process.env.ZOHO_API_KEY || "";
    if (!key) throw new Error("Zoho API Key is missing.");
    return { provider: new ZohoAPIProvider({ apiKey: key }), from };
  }

  private initSMTP(config: Record<string, string>, from: string) {
    const host = config.smtp_host || "smtp.zoho.com";
    const port = Number.parseInt(config.smtp_port || "465", 10);
    const secure = config.smtp_secure === undefined 
      ? port === 465 
      : config.smtp_secure === "true";

    const user = this.scrub(config.smtp_user) || process.env.SMTP_USER || "booking@paramadventures.in";
    const pass = this.scrub(config.smtp_pass) || process.env.SMTP_PASS || "";

    return {
      provider: new SMTPProvider({ host, port, user, pass, secure }),
      from
    };
  }

  private scrub(val: any): string {
    if (typeof val !== "string" || val === "") return "";
    return val.replaceAll(/\s/g, "");
  }
}

export const emailFactory = new EmailFactory();
