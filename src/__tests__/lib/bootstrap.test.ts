import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    platformSetting: { upsert: vi.fn() },
    siteSetting: { upsert: vi.fn() },
    role: { upsert: vi.fn(), findUnique: vi.fn() },
    user: { upsert: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({
  hashPassword: vi.fn(),
}));

import { ensureBasicSettings, ensureRoles, emergencyAdminRecovery } from "@/lib/bootstrap";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

describe("ensureBasicSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.platformSetting.upsert).mockResolvedValue({} as any);
    vi.mocked(prisma.siteSetting.upsert).mockResolvedValue({} as any);
  });

  it("upserts every default platform setting without overwriting existing values", async () => {
    await ensureBasicSettings();

    expect(prisma.platformSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "email_provider" },
        update: {},
        create: expect.objectContaining({ key: "email_provider", value: "RESEND" }),
      }),
    );
  });

  it("upserts every default site setting", async () => {
    await ensureBasicSettings();

    expect(prisma.siteSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "site_title" },
        update: {},
        create: expect.objectContaining({ key: "site_title", value: "Param Adventures" }),
      }),
    );
  });
});

describe("ensureRoles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.role.upsert).mockResolvedValue({} as any);
  });

  it("upserts all 5 system roles", async () => {
    await ensureRoles();

    expect(prisma.role.upsert).toHaveBeenCalledTimes(5);
    expect(prisma.role.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: "SUPER_ADMIN" },
        create: expect.objectContaining({ name: "SUPER_ADMIN", isSystem: true }),
      }),
    );
  });
});

describe("emergencyAdminRecovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.mocked(hashPassword).mockResolvedValue("hashed_pw");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null in production regardless of token", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BOOTSTRAP_TOKEN", "secret_token");

    const result = await emergencyAdminRecovery("a@b.com", "pw", "secret_token");

    expect(result).toBeNull();
  });

  it("returns null when BOOTSTRAP_TOKEN is not configured", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("BOOTSTRAP_TOKEN", "");

    const result = await emergencyAdminRecovery("a@b.com", "pw", "anything");

    expect(result).toBeNull();
  });

  it("returns null when the provided token doesn't match", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("BOOTSTRAP_TOKEN", "secret_token");

    const result = await emergencyAdminRecovery("a@b.com", "pw", "wrong_token");

    expect(result).toBeNull();
  });

  it("throws when the SUPER_ADMIN role is missing", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("BOOTSTRAP_TOKEN", "secret_token");
    vi.mocked(prisma.role.findUnique).mockResolvedValue(null);

    await expect(emergencyAdminRecovery("a@b.com", "pw", "secret_token")).rejects.toThrow("SUPER_ADMIN role missing");
  });

  it("upserts the user with a hashed password and SUPER_ADMIN role when the token matches", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("BOOTSTRAP_TOKEN", "secret_token");
    vi.mocked(prisma.role.findUnique).mockResolvedValue({ id: "role-1", name: "SUPER_ADMIN" } as any);
    vi.mocked(prisma.user.upsert).mockResolvedValue({ id: "user-1", email: "a@b.com" } as any);

    const result = await emergencyAdminRecovery("A@B.com", "pw", "secret_token");

    expect(hashPassword).toHaveBeenCalledWith("pw");
    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "a@b.com" },
        update: expect.objectContaining({ password: "hashed_pw", roleId: "role-1", status: "ACTIVE" }),
        create: expect.objectContaining({ email: "a@b.com", password: "hashed_pw", roleId: "role-1" }),
      }),
    );
    expect(result).toEqual({ id: "user-1", email: "a@b.com" });
  });
});
