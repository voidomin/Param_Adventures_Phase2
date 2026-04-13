import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmailFactory, emailFactory } from "@/lib/email/factory";
import { prisma } from "@/lib/db";

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

describe("EmailFactory Shield Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it("scrub() should remove all invisible whitespace and line breaks", () => {
    // @ts-ignore - reaching into private for testing the shield
    const factory = new EmailFactory();
    const dirtyValue = "  re_7e\n\r\t \r\n***sy  bp  ";
    // @ts-ignore
    const cleanValue = factory.scrub(dirtyValue);
    
    // Should remove ALL spaces and line breaks
    expect(cleanValue).toBe("re_7e***sybp");
  });

  it("should prioritize Database settings over Environment variables (Authority Test)", async () => {
    // 1. Setup Database Settings
    (prisma.platformSetting.findMany as any).mockResolvedValue([
      { key: "email_provider", value: "RESEND" },
      { key: "resend_api_key", value: "DB_KEY_123" },
      { key: "smtp_host", value: "db.smtp.com" }
    ]);

    // 2. Setup Env Variables
    process.env.RESEND_API_KEY = "ENV_KEY_456";
    process.env.EMAIL_PROVIDER = "SMTP";

    // 3. Get Provider Configuration via private method (testing logic flow)
    // @ts-ignore
    const options = await emailFactory.fetchResolvedConfig();

    // 4. Verification
    expect(prisma.platformSetting.findMany).toHaveBeenCalled();
    expect(options.email_provider).toBe("RESEND"); // DATABASE AUTHORITY!
    expect(options.resend_api_key).toBe("DB_KEY_123"); 
    
    // Test the scrubbed result in initResend
    // @ts-ignore
    const res = emailFactory.initResend(options, "test@test.com");
    expect(res.provider).toBeDefined();
    // Since it's private and we don't have dependency injection for providers, 
    // we trust the 'scrub' tests for the string part.
  });

  it("should fallback to Environment variables if Database settings are missing", async () => {
    // 1. DB returns nothing
    (prisma.platformSetting.findMany as any).mockResolvedValue([]);

    // 2. Setup Env Variables
    process.env.RESEND_API_KEY = "ENV_KEY_FALLBACK";
    process.env.EMAIL_PROVIDER = "RESEND";

    // 3. Verify options
    // @ts-ignore
    const options = await emailFactory.fetchResolvedConfig();
    expect(options.resend_api_key).toBeUndefined(); // It's not in the object from DB
    
    // But initResend uses process.env fallback
    // @ts-ignore
    const res = emailFactory.initResend(options, "test@test.com");
    expect(res.provider).toBeDefined();
  });
});
