import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const sendMock = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function (this: { emails: { send: typeof sendMock } }) {
    this.emails = { send: sendMock };
  }),
}));

import { ResendProvider } from "@/lib/email/providers/resend";

describe("ResendProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends with the default from address when none is provided", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_1" }, error: null });
    const provider = new ResendProvider({ apiKey: "test_key" });

    await provider.send({ to: "user@example.com", subject: "Hi", html: "<p>Hi</p>" });

    expect(sendMock).toHaveBeenCalledWith({
      from: "Param Adventures <booking@paramadventures.in>",
      to: ["user@example.com"],
      subject: "Hi",
      html: "<p>Hi</p>",
    });
  });

  it("uses a custom from address when provided", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_2" }, error: null });
    const provider = new ResendProvider({ apiKey: "test_key" });

    await provider.send({
      to: "user@example.com",
      subject: "Hi",
      html: "<p>Hi</p>",
      from: "Custom <custom@example.com>",
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: "Custom <custom@example.com>" }),
    );
  });

  it("throws when Resend returns an API error", async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: "invalid api key" } });
    const provider = new ResendProvider({ apiKey: "bad_key" });

    await expect(
      provider.send({ to: "user@example.com", subject: "Hi", html: "<p>Hi</p>" }),
    ).rejects.toThrow("Resend API error: invalid api key");
  });

  it("throws when the underlying send() rejects", async () => {
    sendMock.mockRejectedValue(new Error("network down"));
    const provider = new ResendProvider({ apiKey: "test_key" });

    await expect(
      provider.send({ to: "user@example.com", subject: "Hi", html: "<p>Hi</p>" }),
    ).rejects.toThrow("network down");
  });

  it("times out if Resend never resolves", async () => {
    vi.useFakeTimers();
    sendMock.mockImplementation(() => new Promise(() => {})); // never resolves
    const provider = new ResendProvider({ apiKey: "test_key" });

    const promise = provider.send({ to: "user@example.com", subject: "Hi", html: "<p>Hi</p>" });
    const assertion = expect(promise).rejects.toThrow("Resend API request timeout");

    await vi.advanceTimersByTimeAsync(10000);
    await assertion;
  });
});
