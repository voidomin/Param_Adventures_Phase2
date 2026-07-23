import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { sendMailMock, createTransportMock } = vi.hoisted(() => {
  const sendMailMock = vi.fn();
  const createTransportMock = vi.fn(() => ({ sendMail: sendMailMock }));
  return { sendMailMock, createTransportMock };
});

vi.mock("nodemailer", () => ({
  default: { createTransport: createTransportMock },
}));

import { SMTPProvider } from "@/lib/email/providers/smtp";

describe("SMTPProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults secure to true for port 465", () => {
    new SMTPProvider({ host: "smtp.zoho.in", port: 465, user: "u", pass: "p" });

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ port: 465, secure: true }),
    );
  });

  it("defaults secure to false for non-465 ports", () => {
    new SMTPProvider({ host: "smtp.zoho.in", port: 587, user: "u", pass: "p" });

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ port: 587, secure: false }),
    );
  });

  it("respects an explicit secure flag over the port guess", () => {
    new SMTPProvider({ host: "smtp.zoho.in", port: 587, user: "u", pass: "p", secure: true });

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ port: 587, secure: true }),
    );
  });

  it("sends mail on the first attempt without retrying", async () => {
    sendMailMock.mockResolvedValue(undefined);
    const provider = new SMTPProvider({ host: "smtp.zoho.in", port: 465, user: "u", pass: "p" });

    await provider.send({ to: "user@example.com", subject: "Hi", html: "<p>Hi</p>", from: "a@b.com" });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith({
      from: "a@b.com",
      to: "user@example.com",
      subject: "Hi",
      html: "<p>Hi</p>",
    });
  });

  it("retries with backoff on transient failures and eventually succeeds", async () => {
    vi.useFakeTimers();
    sendMailMock
      .mockRejectedValueOnce(new Error("temp fail 1"))
      .mockRejectedValueOnce(new Error("temp fail 2"))
      .mockResolvedValueOnce(undefined);
    const provider = new SMTPProvider({ host: "smtp.zoho.in", port: 465, user: "u", pass: "p" });

    const promise = provider.send({ to: "user@example.com", subject: "Hi", html: "<p>Hi</p>" });
    await vi.runAllTimersAsync();
    await promise;

    expect(sendMailMock).toHaveBeenCalledTimes(3);
  });

  it("throws after exhausting all retry attempts", async () => {
    vi.useFakeTimers();
    sendMailMock.mockRejectedValue(new Error("permanent fail"));
    const provider = new SMTPProvider({ host: "smtp.zoho.in", port: 465, user: "u", pass: "p" });

    const promise = provider.send({ to: "user@example.com", subject: "Hi", html: "<p>Hi</p>" });
    const assertion = expect(promise).rejects.toThrow("permanent fail");
    await vi.runAllTimersAsync();
    await assertion;

    expect(sendMailMock).toHaveBeenCalledTimes(3);
  });
});
