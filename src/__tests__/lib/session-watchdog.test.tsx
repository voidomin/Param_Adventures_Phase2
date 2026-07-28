import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { installSessionWatchdog } from "@/lib/session-watchdog";

function mockResponse(status: number, body: unknown) {
  return {
    status,
    clone() {
      return this;
    },
    json: async () => body,
  } as unknown as Response;
}

describe("installSessionWatchdog", () => {
  let originalFetch: typeof fetch;
  let uninstall: () => void;

  beforeEach(() => {
    originalFetch = window.fetch;
  });

  afterEach(() => {
    uninstall?.();
    window.fetch = originalFetch;
  });

  it("triggers onSessionExpired for a known session-invalid message on an /api/ path", async () => {
    window.fetch = vi.fn().mockResolvedValue(mockResponse(401, { error: "Authentication required." }));
    const onSessionExpired = vi.fn();
    uninstall = installSessionWatchdog(onSessionExpired);

    await window.fetch("/api/admin/bookings");
    // The check happens after an internal await -- flush microtasks.
    await Promise.resolve();
    await Promise.resolve();

    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it("does not trigger for a 401 with an unrelated message", async () => {
    window.fetch = vi.fn().mockResolvedValue(mockResponse(401, { error: "Invalid email or password." }));
    const onSessionExpired = vi.fn();
    uninstall = installSessionWatchdog(onSessionExpired);

    await window.fetch("/api/some-endpoint");
    await Promise.resolve();
    await Promise.resolve();

    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("does not trigger for excluded auth-action paths even with a matching message", async () => {
    window.fetch = vi.fn().mockResolvedValue(mockResponse(401, { error: "Authentication required." }));
    const onSessionExpired = vi.fn();
    uninstall = installSessionWatchdog(onSessionExpired);

    await window.fetch("/api/user/2fa/disable");
    await Promise.resolve();
    await Promise.resolve();

    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("does not trigger for non-API paths", async () => {
    window.fetch = vi.fn().mockResolvedValue(mockResponse(401, { error: "Authentication required." }));
    const onSessionExpired = vi.fn();
    uninstall = installSessionWatchdog(onSessionExpired);

    await window.fetch("/some-page");
    await Promise.resolve();
    await Promise.resolve();

    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("only fires once even if multiple calls report an invalid session", async () => {
    window.fetch = vi.fn().mockResolvedValue(mockResponse(403, { error: "User not found or inactive." }));
    const onSessionExpired = vi.fn();
    uninstall = installSessionWatchdog(onSessionExpired);

    await window.fetch("/api/bookings");
    await window.fetch("/api/experiences");
    await Promise.resolve();
    await Promise.resolve();

    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it("does not trigger for a successful response", async () => {
    window.fetch = vi.fn().mockResolvedValue(mockResponse(200, { ok: true }));
    const onSessionExpired = vi.fn();
    uninstall = installSessionWatchdog(onSessionExpired);

    await window.fetch("/api/bookings");
    await Promise.resolve();

    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("restores the original fetch on uninstall", async () => {
    const wrapped = window.fetch;
    uninstall = installSessionWatchdog(vi.fn());
    expect(window.fetch).not.toBe(wrapped);
    uninstall();
    expect(window.fetch).toBe(wrapped);
  });
});
