import { describe, it, expect, vi } from "vitest";

vi.stubEnv("DB_ENCRYPTION_KEY", "test-encryption-key-1234567890");

import {
  generateTwoFactorSecret,
  verifyTwoFactorToken,
  generateBackupCodes,
  consumeBackupCode,
} from "@/lib/two-factor";
import { generateSync } from "otplib";

describe("two-factor", () => {
  describe("generateTwoFactorSecret", () => {
    it("returns a plain secret, its encrypted form, a provisioning URI, and a QR code", async () => {
      const result = await generateTwoFactorSecret("user@example.com");
      expect(result.plainSecret).toBeTruthy();
      expect(result.encryptedSecret).not.toBe(result.plainSecret);
      expect(result.provisioningUri).toContain("otpauth://totp/");
      expect(result.provisioningUri).toContain(encodeURIComponent("user@example.com"));
      expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe("verifyTwoFactorToken", () => {
    it("accepts a currently-valid code for the encrypted secret", async () => {
      const { plainSecret, encryptedSecret } = await generateTwoFactorSecret("user@example.com");
      const code = generateSync({ secret: plainSecret });
      expect(verifyTwoFactorToken(encryptedSecret, code)).toBe(true);
    });

    it("rejects a wrong code", async () => {
      const { encryptedSecret } = await generateTwoFactorSecret("user@example.com");
      expect(verifyTwoFactorToken(encryptedSecret, "000000")).toBe(false);
    });

    it("rejects a non-6-digit input without attempting verification", async () => {
      const { encryptedSecret } = await generateTwoFactorSecret("user@example.com");
      expect(verifyTwoFactorToken(encryptedSecret, "abc")).toBe(false);
    });

    it("rejects an unparseable/corrupt encrypted secret instead of throwing", () => {
      expect(verifyTwoFactorToken("not-a-valid-encrypted-value", "123456")).toBe(false);
    });
  });

  describe("generateBackupCodes / consumeBackupCode", () => {
    it("generates 10 unique codes with matching hashes", () => {
      const { plainCodes, hashedCodes } = generateBackupCodes();
      expect(plainCodes).toHaveLength(10);
      expect(hashedCodes).toHaveLength(10);
      expect(new Set(plainCodes).size).toBe(10);
    });

    it("consumes a valid backup code exactly once", () => {
      const { plainCodes, hashedCodes } = generateBackupCodes();
      const codeToUse = plainCodes[0];

      const first = consumeBackupCode(codeToUse, hashedCodes);
      expect(first.valid).toBe(true);
      expect(first.remainingHashedCodes).toHaveLength(9);

      const second = consumeBackupCode(codeToUse, first.remainingHashedCodes);
      expect(second.valid).toBe(false);
    });

    it("is case-insensitive when matching a backup code", () => {
      const { plainCodes, hashedCodes } = generateBackupCodes();
      const result = consumeBackupCode(plainCodes[0].toLowerCase(), hashedCodes);
      expect(result.valid).toBe(true);
    });

    it("rejects an unknown backup code", () => {
      const { hashedCodes } = generateBackupCodes();
      const result = consumeBackupCode("FFFFFFFFFF", hashedCodes);
      expect(result.valid).toBe(false);
      expect(result.remainingHashedCodes).toEqual(hashedCodes);
    });
  });
});
