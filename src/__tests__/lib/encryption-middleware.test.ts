import { describe, it, expect, vi } from "vitest";
import { withEncryption } from "@/lib/encryption-middleware";
import { encrypt } from "@/lib/encryption";

// Minimal fake Prisma Client Extension host: captures the query hooks passed
// to $extends and exposes them so tests can invoke create/update/find handlers
// directly, the same way the real Prisma runtime would.
function createFakeClient() {
  return {
    $extends(config: any) {
      return { __hooks: config.query };
    },
  };
}

describe("Encryption Middleware (Prisma Client Extension)", () => {
  it("encrypts sensitive fields on create", async () => {
    const extended = withEncryption(createFakeClient() as any) as any;
    const query = vi.fn().mockResolvedValue({ key: "smtp_pass", value: "placeholder" });

    const args = { data: { key: "smtp_pass", value: "raw-password" } };
    await extended.__hooks.platformSetting.create({ args, query });

    expect(args.data.value).not.toBe("raw-password");
    expect(args.data.value.split(":")).toHaveLength(3);
    expect(query).toHaveBeenCalledWith(args);
  });

  it("leaves non-sensitive fields untouched on create", async () => {
    const extended = withEncryption(createFakeClient() as any) as any;
    const query = vi.fn().mockResolvedValue({ key: "smtp_host", value: "smtp.example.com" });

    const args = { data: { key: "smtp_host", value: "smtp.example.com" } };
    await extended.__hooks.platformSetting.create({ args, query });

    expect(args.data.value).toBe("smtp.example.com");
  });

  it("encrypts sensitive fields on update, using where.key when data has no key", async () => {
    const extended = withEncryption(createFakeClient() as any) as any;
    const query = vi.fn().mockResolvedValue({ key: "razorpay_key_secret", value: "placeholder" });

    const args = { where: { key: "razorpay_key_secret" }, data: { value: "raw-secret" } };
    await extended.__hooks.platformSetting.update({ args, query });

    expect(args.data.value).not.toBe("raw-secret");
    expect(args.data.value.split(":")).toHaveLength(3);
  });

  it("decrypts sensitive fields on findUnique", async () => {
    const extended = withEncryption(createFakeClient() as any) as any;
    const rawVal = "my-secret-val";
    const query = vi.fn().mockResolvedValue({ key: "smtp_pass", value: encrypt(rawVal) });

    const result = await extended.__hooks.platformSetting.findUnique({ args: { where: { key: "smtp_pass" } }, query });

    expect(result.value).toBe(rawVal);
  });

  it("decrypts sensitive fields on findMany, leaving non-sensitive rows untouched", async () => {
    const extended = withEncryption(createFakeClient() as any) as any;
    const rawVal = "my-secret-val";
    const query = vi.fn().mockResolvedValue([
      { key: "smtp_pass", value: encrypt(rawVal) },
      { key: "smtp_host", value: "smtp.example.com" },
    ]);

    const result = await extended.__hooks.platformSetting.findMany({ args: {}, query });

    expect(result[0].value).toBe(rawVal);
    expect(result[1].value).toBe("smtp.example.com");
  });

  it("applies the same behavior to siteSetting", async () => {
    const extended = withEncryption(createFakeClient() as any) as any;
    const query = vi.fn().mockResolvedValue({ key: "jwt_secret", value: "placeholder" });

    const args = { data: { key: "jwt_secret", value: "raw-jwt-secret" } };
    await extended.__hooks.siteSetting.create({ args, query });

    expect(args.data.value).not.toBe("raw-jwt-secret");
    expect(args.data.value.split(":")).toHaveLength(3);
  });
});
