import crypto from "crypto";

const ENCRYPTION_KEY_RAW = process.env.DB_ENCRYPTION_KEY || "default-fallback-key-should-be-changed-in-prod";
const KEY = crypto.createHash("sha256").update(ENCRYPTION_KEY_RAW).digest(); // Always 32 bytes
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

/**
 * Encrypts plain text using AES-256-GCM.
 * Returns a formatted string: "iv:encryptedText:authTag"
 */
export function encrypt(text: string): string {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${encrypted}:${authTag}`;
}

/**
 * Decrypts a formatted AES-256-GCM cipher text.
 * Falls back to returning the raw input if the text is not encrypted or decryption fails.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;

  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    return encryptedText; // Fallback to plain text
  }

  try {
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = Buffer.from(parts[1], "hex");
    const authTag = Buffer.from(parts[2], "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, undefined, "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    // If decryption fails, it's likely legacy plain text or a configuration mismatch.
    // Fall back to the original text rather than crashing.
    return encryptedText;
  }
}
