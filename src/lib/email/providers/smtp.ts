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
    try {
      await this.transporter.sendMail({
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      console.log(`✅ [SMTP] Email sent to ${options.to}`);
    } catch (error) {
      console.error(`❌ [SMTP] Delivery failed to ${options.to}:`, error);
      throw error;
    }
  }
}
