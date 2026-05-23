import { describe, it, expect, vi } from "vitest";
import { registerEncryptionMiddleware } from "@/lib/encryption-middleware";
import { encrypt } from "@/lib/encryption";

describe("Encryption Middleware", () => {
  it("should encrypt sensitive fields on create", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let registeredMiddleware: any = null;
    const mockClient = {
      $use: (fn: unknown) => {
        registeredMiddleware = fn;
      }
    };

    registerEncryptionMiddleware(mockClient);
    expect(registeredMiddleware).toBeTypeOf("function");

    const params = {
      model: "PlatformSetting",
      action: "create",
      args: {
        data: {
          key: "smtp_pass",
          value: "raw-password"
        }
      }
    };

    const next = vi.fn().mockResolvedValue({ key: "smtp_pass", value: "placeholder" });
    await registeredMiddleware(params, next);

    // Verify that the value was encrypted
    expect(params.args.data.value).not.toBe("raw-password");
    expect(params.args.data.value.split(":").length).toBe(3);
    expect(next).toHaveBeenCalledWith(params);
  });

  it("should decrypt sensitive fields on read", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let registeredMiddleware: any = null;
    const mockClient = {
      $use: (fn: unknown) => {
        registeredMiddleware = fn;
      }
    };

    registerEncryptionMiddleware(mockClient);

    const params = {
      model: "PlatformSetting",
      action: "findMany"
    };

    const rawVal = "my-secret-val";
    const realCipherText = encrypt(rawVal);

    const next = vi.fn().mockResolvedValue([
      { key: "smtp_pass", value: realCipherText },
      { key: "smtp_host", value: "smtp.example.com" }
    ]);

    const result = await registeredMiddleware(params, next);

    expect(result[0].value).toBe(rawVal); // Decrypted!
    expect(result[1].value).toBe("smtp.example.com"); // Untouched!
  });
});
