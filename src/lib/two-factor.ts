import crypto from "node:crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { encrypt, decrypt } from "@/lib/encryption";

const ISSUER = "Param Adventures";
const BACKUP_CODE_COUNT = 10;

/**
 * Generates a new TOTP secret and its encrypted-at-rest form (for storing on
 * User.twoFactorSecret) plus the otpauth:// provisioning URI an authenticator
 * app scans as a QR code. The plaintext secret is only ever returned here,
 * during enrollment -- never read back out once stored.
 */
export async function generateTwoFactorSecret(email: string): Promise<{
  plainSecret: string;
  encryptedSecret: string;
  provisioningUri: string;
  qrCodeDataUrl: string;
}> {
  const plainSecret = generateSecret();
  const provisioningUri = generateURI({ secret: plainSecret, label: email, issuer: ISSUER });
  return {
    plainSecret,
    encryptedSecret: encrypt(plainSecret),
    provisioningUri,
    qrCodeDataUrl: await QRCode.toDataURL(provisioningUri),
  };
}

/**
 * Verifies a 6-digit TOTP code against an encrypted-at-rest secret.
 */
export function verifyTwoFactorToken(encryptedSecret: string, token: string): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  try {
    const secret = decrypt(encryptedSecret);
    return verifySync({ secret, token }).valid;
  } catch {
    return false;
  }
}

/**
 * Generates a fresh batch of one-time backup codes. Returns both the plain
 * codes (shown to the user exactly once, at enrollment) and their hashes
 * (what actually gets stored -- backup codes are as sensitive as a password,
 * so they're never kept in a form that could be read back out).
 */
export function generateBackupCodes(): { plainCodes: string[]; hashedCodes: string[] } {
  const plainCodes = Array.from({ length: BACKUP_CODE_COUNT }, () =>
    crypto.randomBytes(5).toString("hex").toUpperCase(),
  );
  const hashedCodes = plainCodes.map(hashBackupCode);
  return { plainCodes, hashedCodes };
}

function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code.toUpperCase().trim()).digest("hex");
}

/**
 * Checks a user-supplied backup code against their stored hashes. On success,
 * returns the remaining set of hashes with the used one removed -- backup
 * codes are single-use, so the caller should persist this back to the user
 * record immediately.
 */
export function consumeBackupCode(
  providedCode: string,
  storedHashedCodes: string[],
): { valid: boolean; remainingHashedCodes: string[] } {
  const hash = hashBackupCode(providedCode);
  const index = storedHashedCodes.indexOf(hash);
  if (index === -1) {
    return { valid: false, remainingHashedCodes: storedHashedCodes };
  }
  const remainingHashedCodes = [...storedHashedCodes];
  remainingHashedCodes.splice(index, 1);
  return { valid: true, remainingHashedCodes };
}
