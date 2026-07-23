import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ZohoAPIProvider } from "@/lib/email/providers/zoho-api";

describe("ZohoAPIProvider", () => {
  beforeEach(() => {
    vi.useRealTimers();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("strips a 'Zoho-enczapikey' prefix from the configured key", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    const provider = new ZohoAPIProvider({ apiKey: "Zoho-enczapikey  abc123" });
    await provider.send({ to: "user@example.com", subject: "Hi", html: "<p>Hi</p>" });

    const [, requestInit] = vi.mocked(globalThis.fetch).mock.calls[0];
    const headers = requestInit!.headers as Record<string, string>;
    expect(headers.authorization).toBe("Zoho-enczapikey abc123");
  });

  it("builds the region-specific base URL", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as Response);

    const provider = new ZohoAPIProvider({ apiKey: "key", region: "com" });
    await provider.send({ to: "user@example.com", subject: "Hi", html: "<p>Hi</p>" });

    const [url] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(url).toBe("https://api.zeptomail.com/v1.1/email");
  });

  it("parses a 'Name <email>' from address into name and address fields", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as Response);

    const provider = new ZohoAPIProvider({ apiKey: "key" });
    await provider.send({
      to: "user@example.com",
      subject: "Hi",
      html: "<p>Hi</p>",
      from: "Custom Sender <custom@example.com>",
    });

    const [, requestInit] = vi.mocked(globalThis.fetch).mock.calls[0];
    const body = JSON.parse(requestInit!.body as string);
    expect(body.from).toEqual({ address: "custom@example.com", name: "Custom Sender" });
  });

  it("falls back to the default sender when no from address is given", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as Response);

    const provider = new ZohoAPIProvider({ apiKey: "key" });
    await provider.send({ to: "user@example.com", subject: "Hi", html: "<p>Hi</p>" });

    const [, requestInit] = vi.mocked(globalThis.fetch).mock.calls[0];
    const body = JSON.parse(requestInit!.body as string);
    expect(body.from).toEqual({ address: "booking@paramadventures.in", name: "Param Adventures" });
  });

  it("throws with the response body when the API returns a non-ok response", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "invalid_key" }),
    } as Response);

    const provider = new ZohoAPIProvider({ apiKey: "bad-key" });

    await expect(
      provider.send({ to: "user@example.com", subject: "Hi", html: "<p>Hi</p>" }),
    ).rejects.toThrow(/invalid_key/);
  });

  it("throws a timeout-specific error when the request aborts", async () => {
    vi.mocked(globalThis.fetch).mockImplementation(() => {
      const err = new Error("aborted");
      err.name = "AbortError";
      return Promise.reject(err);
    });

    const provider = new ZohoAPIProvider({ apiKey: "key" });

    await expect(
      provider.send({ to: "user@example.com", subject: "Hi", html: "<p>Hi</p>" }),
    ).rejects.toThrow("Zoho API delivery timed out to user@example.com");
  });

  it("rethrows unexpected network errors as-is", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new Error("network unreachable"));

    const provider = new ZohoAPIProvider({ apiKey: "key" });

    await expect(
      provider.send({ to: "user@example.com", subject: "Hi", html: "<p>Hi</p>" }),
    ).rejects.toThrow("network unreachable");
  });
});
