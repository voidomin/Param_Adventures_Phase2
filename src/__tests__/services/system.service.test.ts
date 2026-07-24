import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockVerify = vi.fn();
const mockCreateTransport = vi.fn((...transportArgs: unknown[]) => {
  void transportArgs;
  return { verify: mockVerify };
});
vi.mock("nodemailer", () => ({
  default: { createTransport: (...args: unknown[]) => mockCreateTransport(...args) },
}));

const mockExecPromise = vi.fn();
vi.mock("node:child_process", () => ({
  exec: vi.fn(),
}));
vi.mock("node:util", () => ({
  promisify: () => (...args: unknown[]) => mockExecPromise(...args),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    role: { count: vi.fn() },
    booking: { count: vi.fn() },
    permission: { count: vi.fn() },
    user: { count: vi.fn() },
  },
}));

const mockRunSeed = vi.fn();
vi.mock("../../../prisma/seed.mjs", () => ({
  main: (...args: unknown[]) => mockRunSeed(...args),
}));

import { SystemService } from "@/services/system.service";
import { prisma } from "@/lib/db";

describe("SystemService.verifySmtpConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws when SMTP credentials aren't configured", async () => {
    vi.stubEnv("SMTP_USER", "");
    vi.stubEnv("SMTP_PASS", "");

    await expect(SystemService.verifySmtpConnection()).rejects.toThrow("SMTP credentials not configured");
  });

  it("verifies the connection using configured host/port/credentials", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("SMTP_PORT", "587");
    vi.stubEnv("SMTP_SECURE", "false");
    vi.stubEnv("SMTP_USER", "user@example.com");
    vi.stubEnv("SMTP_PASS", "secret");
    mockVerify.mockResolvedValue(true);

    const result = await SystemService.verifySmtpConnection();

    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: "smtp.example.com", port: 587, secure: false }),
    );
    expect(result).toEqual({ host: "smtp.example.com", port: 587, secure: false });
  });

  it("defaults to secure when the port is 465", async () => {
    vi.stubEnv("SMTP_HOST", "");
    vi.stubEnv("SMTP_PORT", "");
    vi.stubEnv("SMTP_SECURE", "");
    vi.stubEnv("SMTP_USER", "user@example.com");
    vi.stubEnv("SMTP_PASS", "secret");
    mockVerify.mockResolvedValue(true);

    const result = await SystemService.verifySmtpConnection();

    expect(result).toEqual({ host: "smtp.zoho.in", port: 465, secure: true });
  });
});

describe("SystemService.repairSchema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs prisma db push and returns counts alongside stdout/stderr", async () => {
    mockExecPromise.mockResolvedValue({ stdout: "pushed schema", stderr: "" });
    vi.mocked(prisma.role.count).mockResolvedValue(5);
    vi.mocked(prisma.booking.count).mockResolvedValue(42);

    const result = await SystemService.repairSchema();

    expect(mockExecPromise).toHaveBeenCalledWith("npx prisma db push", expect.objectContaining({ env: process.env }));
    expect(result).toEqual({ rolesCount: 5, bookingsCount: 42, stdout: "pushed schema", stderr: "" });
  });
});

describe("SystemService.bootstrapDatabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when roles already exist", async () => {
    vi.mocked(prisma.role.count).mockResolvedValue(3);

    await expect(SystemService.bootstrapDatabase()).rejects.toThrow("Database already bootstrapped");
    expect(mockRunSeed).not.toHaveBeenCalled();
  });

  it("runs the seed and returns the resulting counts when no roles exist", async () => {
    vi.mocked(prisma.role.count).mockResolvedValueOnce(0).mockResolvedValueOnce(5);
    vi.mocked(prisma.permission.count).mockResolvedValue(20);
    vi.mocked(prisma.user.count).mockResolvedValue(1);
    mockRunSeed.mockResolvedValue(undefined);

    const result = await SystemService.bootstrapDatabase();

    expect(mockRunSeed).toHaveBeenCalledWith(prisma);
    expect(result).toEqual({ rolesCreated: 5, permissionsCreated: 20, superAdminsCreated: 1 });
  });
});
