import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmailFactory, emailFactory } from "@/lib/email/factory";
import { prisma } from "@/lib/db";
import { ResendProvider } from "@/lib/email/providers/resend";
import { ZohoAPIProvider } from "@/lib/email/providers/zoho-api";
import { SMTPProvider } from "@/lib/email/providers/smtp";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    platformSetting: {
      findMany: vi.fn(),
    },
  },
}));

// Mock process.env
const originalEnv = process.env;

describe("EmailFactory Comprehensive Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it("scrub() should remove all invisible whitespace and line breaks", () => {
    const factory = new EmailFactory();
    // @ts-ignore - reaching into private for testing
    const cleanValue = factory.scrub("  re_7e\n\r\t \r\n***sy  bp  ");
    expect(cleanValue).toBe("re_7e***sybp");
  });

  it("should prioritize Database settings over Environment variables", async () => {
    vi.mocked(prisma.platformSetting.findMany).mockResolvedValue([
      { id: "1", key: "email_provider", value: "RESEND" },
      { id: "2", key: "resend_api_key", value: "DB_KEY_123" },
    ] as any);

    process.env.RESEND_API_KEY = "ENV_KEY_456";

    // @ts-ignore
    const options = await emailFactory.fetchResolvedConfig();
    expect(options.email_provider).toBe("RESEND");
    expect(options.resend_api_key).toBe("DB_KEY_123");
  });

  it("should fallback to Environment variables if Database settings are missing", async () => {
    vi.mocked(prisma.platformSetting.findMany).mockResolvedValue([]);

    process.env.RESEND_API_KEY = "ENV_KEY_FALLBACK";

    // @ts-ignore
    const options = await emailFactory.fetchResolvedConfig();
    // @ts-ignore
    const res = emailFactory.initResend(options, "test@test.com");
    expect(res.provider).toBeDefined();
  });

  describe("getProvider", () => {
    it("returns ResendProvider when email_provider is RESEND", async () => {
      vi.mocked(prisma.platformSetting.findMany).mockResolvedValue([
        { id: "1", key: "email_provider", value: "RESEND" },
        { id: "2", key: "resend_api_key", value: "resend-api-key-value" },
        { id: "3", key: "smtp_from", value: "custom-from@domain.com" },
      ] as any);

      const result = await emailFactory.getProvider();
      expect(result.provider).toBeInstanceOf(ResendProvider);
      expect(result.from).toBe("custom-from@domain.com");
    });

    it("throws error if RESEND API key is missing", async () => {
      vi.mocked(prisma.platformSetting.findMany).mockResolvedValue([
        { id: "1", key: "email_provider", value: "RESEND" },
      ] as any);
      delete process.env.RESEND_API_KEY;

      await expect(emailFactory.getProvider()).rejects.toThrow("Resend API Key is missing.");
    });

    it("returns ZohoAPIProvider when email_provider is ZOHO_API", async () => {
      vi.mocked(prisma.platformSetting.findMany).mockResolvedValue([
        { id: "1", key: "email_provider", value: "ZOHO_API" },
        { id: "2", key: "zoho_api_key", value: "zoho-api-key-value" },
        { id: "3", key: "zoho_api_region", value: "eu" },
      ] as any);

      const result = await emailFactory.getProvider();
      expect(result.provider).toBeInstanceOf(ZohoAPIProvider);
      expect(result.from).toBe("Param Adventures <booking@paramadventures.in>"); // fallback from
    });

    it("throws error if ZOHO_API key is missing", async () => {
      vi.mocked(prisma.platformSetting.findMany).mockResolvedValue([
        { id: "1", key: "email_provider", value: "ZOHO_API" },
      ] as any);
      delete process.env.ZOHO_API_KEY;

      await expect(emailFactory.getProvider()).rejects.toThrow("Zoho API Key is missing.");
    });

    it("returns SMTPProvider when email_provider is default ZOHO_SMTP or SMTP", async () => {
      vi.mocked(prisma.platformSetting.findMany).mockResolvedValue([
        { id: "1", key: "email_provider", value: "ZOHO_SMTP" },
        { id: "2", key: "smtp_host", value: "smtp.zoho.com" },
        { id: "3", key: "smtp_port", value: "587" },
        { id: "4", key: "smtp_user", value: "user@domain.com" },
        { id: "5", key: "smtp_pass", value: "pass123" },
        { id: "6", key: "smtp_secure", value: "false" },
      ] as any);

      const result = await emailFactory.getProvider();
      expect(result.provider).toBeInstanceOf(SMTPProvider);
    });

    it("respects overrideConfig inputs over database configuration", async () => {
      vi.mocked(prisma.platformSetting.findMany).mockResolvedValue([
        { id: "1", key: "email_provider", value: "SMTP" },
      ] as any);

      const result = await emailFactory.getProvider({
        email_provider: "RESEND",
        resend_api_key: "overridden-resend-key",
      });

      expect(result.provider).toBeInstanceOf(ResendProvider);
    });
  });
});
