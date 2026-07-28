import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyTurnstileToken } from "@/lib/turnstile";

describe("verifyTurnstileToken", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("passes through when no secret key is configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const result = await verifyTurnstileToken(undefined, "1.2.3.4");
    expect(result).toBe(true);
  });

  it("rejects a missing token when a secret key is configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    const result = await verifyTurnstileToken(undefined, "1.2.3.4");
    expect(result).toBe(false);
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
