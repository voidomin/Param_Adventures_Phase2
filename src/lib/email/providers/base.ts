export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface EmailProvider {
  /**
   * Send an email using the established provider strategy.
   * @throws Error if transport fails.
   */
  send(options: EmailOptions): Promise<void>;
}
