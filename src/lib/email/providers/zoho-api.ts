import { EmailProvider, EmailOptions } from "./base";
import { maskEmail } from "@/lib/utils";

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
    let key = config.apiKey || "";
    // Automatically strip any "zoho-enczapikey" prefix (case-insensitive) and spaces
    key = key.replace(/^zoho-enczapikey\s+/i, "").trim();
    this.apiKey = key;
    const region = config.region || "in";
    this.baseUrl = `https://api.zeptomail.${region}/v1.1/email`;
  }

  async send(options: EmailOptions): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000); // 10 seconds timeout

    let fromAddress = "booking@paramadventures.in";
    let fromName = "Param Adventures";

    if (options.from) {
      // Parse "Name <email>" or "\"Name\" <email>" without a backtracking-prone
      // regex -- plain index lookups are O(n) regardless of input shape.
      const angleStart = options.from.indexOf("<");
      const angleEnd = angleStart === -1 ? -1 : options.from.indexOf(">", angleStart);
      if (angleStart !== -1 && angleEnd !== -1) {
        const namePart = options.from.slice(0, angleStart).trim().replace(/^"|"$/g, "");
        fromName = namePart || "Param Adventures";
        fromAddress = options.from.slice(angleStart + 1, angleEnd).trim();
      } else {
        fromAddress = options.from.trim();
      }
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "authorization": `Zoho-enczapikey ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: { address: fromAddress, name: fromName },
          to: [{ email_address: { address: options.to } }],
          subject: options.subject,
          htmlbody: options.html,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(`Zoho API error: ${JSON.stringify(errData)}`);
      }

      console.log(`✅ [Zoho API] HTTP Delivery successful to ${maskEmail(options.to)}`);
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === "AbortError") {
        console.error(`❌ [Zoho API] Delivery timed out after 10s to ${maskEmail(options.to)}`);
        throw new Error(`Zoho API delivery timed out to ${maskEmail(options.to)}`);
      }
      console.error(`❌ [Zoho API] Delivery failed to ${maskEmail(options.to)}:`, error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
