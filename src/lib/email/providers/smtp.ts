import nodemailer from "nodemailer";
import { EmailProvider, EmailOptions } from "./base";

export interface SMTPConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure?: boolean;
}

export class SMTPProvider implements EmailProvider {
  private readonly transporter: nodemailer.Transporter;

  constructor(config: SMTPConfig) {
    // Total Authority: If secure is provided by dashboard, use it. Otherwise guess by port.
    const secureFlag = config.secure ?? config.port === 465;

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: secureFlag,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      tls: {
        // Essential for production-grade security on cloud servers
        rejectUnauthorized: false,
        minVersion: "TLSv1.2",
        ciphers: "HIGH:!aNULL:!MD5"
      }
    });
  }

  async send(options: EmailOptions): Promise<void> {
    const maxRetries = 3;
    const baseDelayMs = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.transporter.sendMail({
          from: options.from,
          to: options.to,
          subject: options.subject,
          html: options.html,
        });
        console.log(`✅ [SMTP] Email sent to ${options.to} (attempt ${attempt})`);
        return;
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        if (isLastAttempt) {
          console.error(`❌ [SMTP] Delivery failed to ${options.to} after ${maxRetries} attempts:`, error);
          throw error;
        }
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(`⚠️ [SMTP] Attempt ${attempt}/${maxRetries} failed for ${options.to}, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}
