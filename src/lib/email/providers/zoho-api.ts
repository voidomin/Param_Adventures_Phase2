import { EmailProvider, EmailOptions } from "./base";

export interface ZohoAPIConfig {
  apiKey: string;
  region?: "com" | "in" | "eu" | "com.au";
  senderAddress?: string;
}

/**
 * Zoho API Provider (Transaction / ZeptoMail style)
 * bypasses port blocks by using HTTPS/443.
 */
export class ZohoAPIProvider implements EmailProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ZohoAPIConfig) {
    this.apiKey = config.apiKey;
    const region = config.region || "in";
    this.baseUrl = `https://api.zeptomail.${region}/v1.1/email`;
  }

  async send(options: EmailOptions): Promise<void> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "authorization": `Zoho-enczapikey ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: { address: options.from || "booking@paramadventures.in", name: "Param Adventures" }, // Fallback if from not given
          to: [{ customer_details: { email_address: options.to } }],
          subject: options.subject,
          htmlbody: options.html,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(`Zoho API error: ${JSON.stringify(errData)}`);
      }

      console.log(`✅ [Zoho API] HTTP Delivery successful to ${options.to}`);
    } catch (error) {
      console.error(`❌ [Zoho API] Delivery failed to ${options.to}:`, error);
      throw error;
    }
  }
}
