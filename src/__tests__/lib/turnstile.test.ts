import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    platformSetting: {
      findUnique: vi.fn(),
    },
  },
}));

import { verifyTurnstileToken } from "@/lib/turnstile";
import { prisma } from "@/lib/db";

const mockFindUnique = vi.mocked(prisma.platformSetting.findUnique);

describe("verifyTurnstileToken", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    mockFindUnique.mockResolvedValue(null);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("passes through when no secret key is configured anywhere", async () => {
    const result = await verifyTurnstileToken(undefined, "1.2.3.4");
    expect(result).toBe(true);
  });

  it("rejects a missing token when a secret key is configured via env fallback", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    const result = await verifyTurnstileToken(undefined, "1.2.3.4");
    expect(result).toBe(false);
  });

  it("rejects a missing token when a secret key is configured via the admin setting", async () => {
    mockFindUnique.mockResolvedValue({ key: "turnstile_secret_key", value: "db-secret" } as any);
    const result = await verifyTurnstileToken(undefined, "1.2.3.4");
    expect(result).toBe(false);
  });

  it("prefers the admin setting over the env var when both are present", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "env-secret");
    mockFindUnique.mockResolvedValue({ key: "turnstile_secret_key", value: "db-secret" } as any);
    global.fetch = vi.fn().mockResolvedValue({ json: async () => ({ success: true }) }) as any;

    await verifyTurnstileToken("good-token", "1.2.3.4");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({ body: expect.objectContaining({}) }),
    );
    const call = (global.fetch as any).mock.calls[0][1];
    expect((call.body as URLSearchParams).get("secret")).toBe("db-secret");
  });

  it("accepts a token Cloudflare confirms as valid", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    global.fetch = vi.fn().mockResolvedValue({ json: async () => ({ success: true }) }) as any;

    const result = await verifyTurnstileToken("good-token", "1.2.3.4");
    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("rejects a token Cloudflare marks invalid", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    global.fetch = vi.fn().mockResolvedValue({ json: async () => ({ success: false }) }) as any;

    const result = await verifyTurnstileToken("bad-token", "1.2.3.4");
    expect(result).toBe(false);
  });

  it("fails closed if the verification request throws", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    global.fetch = vi.fn().mockRejectedValue(new Error("network error")) as any;

    const result = await verifyTurnstileToken("some-token", "1.2.3.4");
    expect(result).toBe(false);
  });
});
