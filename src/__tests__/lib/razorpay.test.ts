import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFindMany = vi.fn();
const razorpayCtor = vi.fn(function (this: { config: unknown }, config: unknown) {
  this.config = config;
});

vi.mock("@/lib/db", () => ({
  prisma: { platformSetting: { findMany: mockFindMany } },
}));

vi.mock("razorpay", () => ({
  default: razorpayCtor,
}));

describe("getRazorpay", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses key id/secret from platform settings when present", async () => {
    mockFindMany.mockResolvedValue([
      { key: "razorpay_key_id", value: "db_key_id" },
      { key: "razorpay_key_secret", value: "db_key_secret" },
    ]);

    const { getRazorpay } = await import("@/lib/razorpay");
    await getRazorpay();

    expect(razorpayCtor).toHaveBeenCalledWith({ key_id: "db_key_id", key_secret: "db_key_secret" });
  });

  it("falls back to environment variables when settings are absent", async () => {
    mockFindMany.mockResolvedValue([]);
    vi.stubEnv("RAZORPAY_KEY_ID", "env_key_id");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "env_key_secret");

    const { getRazorpay } = await import("@/lib/razorpay");
    await getRazorpay();

    expect(razorpayCtor).toHaveBeenCalledWith({ key_id: "env_key_id", key_secret: "env_key_secret" });
  });

  it("returns a dummy instance in non-production when no keys are configured anywhere", async () => {
    mockFindMany.mockResolvedValue([]);
    vi.stubEnv("RAZORPAY_KEY_ID", "");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "");
    vi.stubEnv("NODE_ENV", "test");

    const { getRazorpay } = await import("@/lib/razorpay");
    await getRazorpay();

    expect(razorpayCtor).toHaveBeenCalledWith({ key_id: "dummy_id", key_secret: "dummy_secret" });
  });

  it("throws in production when no keys are configured anywhere", async () => {
    mockFindMany.mockResolvedValue([]);
    vi.stubEnv("RAZORPAY_KEY_ID", "");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");

    const { getRazorpay } = await import("@/lib/razorpay");

    await expect(getRazorpay()).rejects.toThrow("Razorpay configuration is missing in both database and environment.");
  });

  it("throws for an unrecognized NODE_ENV (e.g. a misconfigured staging deploy) rather than silently using a dummy gateway", async () => {
    mockFindMany.mockResolvedValue([]);
    vi.stubEnv("RAZORPAY_KEY_ID", "");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "");
    vi.stubEnv("NODE_ENV", "staging");

    const { getRazorpay } = await import("@/lib/razorpay");

    await expect(getRazorpay()).rejects.toThrow("Razorpay configuration is missing in both database and environment.");
  });

  it("reuses the cached instance when the key id hasn't changed", async () => {
    mockFindMany.mockResolvedValue([
      { key: "razorpay_key_id", value: "same_key" },
      { key: "razorpay_key_secret", value: "secret" },
    ]);

    const { getRazorpay } = await import("@/lib/razorpay");
    const first = await getRazorpay();
    const second = await getRazorpay();

    expect(first).toBe(second);
    expect(razorpayCtor).toHaveBeenCalledTimes(1);
  });

  it("creates a fresh instance when the key id changes", async () => {
    mockFindMany.mockResolvedValueOnce([
      { key: "razorpay_key_id", value: "key_one" },
      { key: "razorpay_key_secret", value: "secret" },
    ]);

    const { getRazorpay } = await import("@/lib/razorpay");
    const first = await getRazorpay();

    mockFindMany.mockResolvedValueOnce([
      { key: "razorpay_key_id", value: "key_two" },
      { key: "razorpay_key_secret", value: "secret" },
    ]);
    const second = await getRazorpay();

    expect(first).not.toBe(second);
    expect(razorpayCtor).toHaveBeenCalledTimes(2);
  });
});
