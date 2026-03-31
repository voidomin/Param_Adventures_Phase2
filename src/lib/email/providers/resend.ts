import { Resend } from "resend";
import { EmailProvider, EmailOptions } from "./base";

export interface ResendConfig {
  apiKey: string;
}

export class ResendProvider implements EmailProvider {
  private resend: Resend;

  constructor(config: ResendConfig) {
    this.resend = new Resend(config.apiKey);
  }

  async send(options: EmailOptions): Promise<void> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: options.from || "Param Adventures <booking@paramadventures.in>",
        to: [options.to],
        subject: options.subject,
        html: options.html,
      });

      if (error) {
        throw new Error(`Resend API error: ${error.message}`);
      }

      console.log(`✅ [Resend] Email sent: ${data?.id} to ${options.to}`);
    } catch (error) {
      console.error(`❌ [Resend] Delivery failed to ${options.to}:`, error);
      throw error;
    }
  }
}
