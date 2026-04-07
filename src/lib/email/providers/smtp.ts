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
    const isSSL = config.port === 465;
    const isTLS = config.port === 587;
    
    console.log(`[SMTP] Initializing connection to ${config.host}:${config.port} (SSL Mode: ${isSSL}, TLS Mode: ${isTLS})`);

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: isSSL, 
      requireTLS: isTLS,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      pool: true,
      maxConnections: 3,
      connectionTimeout: 20000,
      tls: {
        minVersion: "TLSv1.2",
        rejectUnauthorized: true,
      },
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
