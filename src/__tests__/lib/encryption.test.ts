import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "@/lib/encryption";

describe("Encryption Utility", () => {
  it("should encrypt and decrypt text successfully", () => {
    const plainText = "my-super-secret-password-123";
    const cipherText = encrypt(plainText);

    expect(cipherText).not.toBe(plainText);
    expect(cipherText.split(":")).toHaveLength(3);

    const decryptedText = decrypt(cipherText);
    expect(decryptedText).toBe(plainText);
  });

  it("should return empty value if text is empty", () => {
    expect(encrypt("")).toBe("");
    expect(decrypt("")).toBe("");
  });

  it("should fall back to original text if the format does not match", () => {
    const plainText = "plain-unencrypted-text";
    expect(decrypt(plainText)).toBe(plainText);
  });

  it("should fall back to original text if decryption fails (invalid hex or authentication tag mismatch)", () => {
    const invalidCipherText = "6c6567616379:616263:123456";
    expect(decrypt(invalidCipherText)).toBe(invalidCipherText);
  });
});
