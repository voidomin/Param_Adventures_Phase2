import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import crypto from "node:crypto";
import readline from "node:readline/promises";

// ─── One-time encryption pass for PlatformSetting/SiteSetting rows that were ───
// ─── never actually encrypted (registerEncryptionMiddleware silently no-op'd ───
// ─── under Prisma 7's removed $use API — see encryption-middleware.ts fix)   ───
//
// Usage:
//   NEW_KEY=<the DB_ENCRYPTION_KEY you're about to set in this environment> \
//   DATABASE_URL=<target DB> \
//   node scripts/encrypt-plaintext-settings.mjs [--apply]
//
// Without --apply: dry-run, reports which rows are plaintext vs already
// encrypted vs empty, writes nothing.
//
// With --apply: encrypts each plaintext row under NEW_KEY inside a
// transaction, then re-reads and decrypts every row to confirm round-trip
// integrity before committing. Aborts the whole transaction if any row
// fails verification. Rows that already look encrypted (iv:enc:authTag
// format) are left untouched — run scripts/rotate-encryption-key.mjs
// instead if you need to re-key already-encrypted data.

const SENSITIVE_KEYS = new Set([
  "jwt_secret",
  "razorpay_key_secret",
  "razorpay_webhook_secret",
  "smtp_pass",
  "zoho_api_key",
  "resend_api_key",
  "aws_secret_access_key",
]);

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function deriveKey(rawKey) {
  return crypto.createHash("sha256").update(rawKey).digest();
}

function encryptWith(key, text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${encrypted}:${authTag}`;
}

function decryptWith(key, encryptedText) {
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("not in iv:encrypted:authTag format");
  }
  const [ivHex, encHex, tagHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, undefined, "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function looksEncrypted(value) {
  const parts = value.split(":");
  return parts.length === 3 && /^[0-9a-f]+$/i.test(parts[0]) && /^[0-9a-f]+$/i.test(parts[2]);
}

async function main() {
  const apply = process.argv.includes("--apply");

  const newKeyRaw = process.env.NEW_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  if (!newKeyRaw) {
    console.error("ERROR: NEW_KEY env var is required.");
    process.exit(1);
  }
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL env var is required.");
    process.exit(1);
  }

  const newKey = deriveKey(newKeyRaw);

  const pool = new pg.Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log(`Mode: ${apply ? "APPLY (will write changes)" : "DRY RUN (no changes will be written)"}`);
  console.log(`Target DB: ${databaseUrl.replace(/:[^:@]+@/, ":****@")}`);
  console.log("");

  if (apply) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(
      "Type EXACTLY 'encrypt' to confirm you have a fresh backup of this database and want to proceed: ",
    );
    rl.close();
    if (answer.trim() !== "encrypt") {
      console.log("Aborted.");
      process.exit(1);
    }
  }

  const platformSettings = await prisma.platformSetting.findMany({
    where: { key: { in: [...SENSITIVE_KEYS] } },
  });
  const siteSettings = await prisma.siteSetting.findMany({
    where: { key: { in: [...SENSITIVE_KEYS] } },
  });

  const rows = [
    ...platformSettings.map((r) => ({ table: "platformSetting", ...r })),
    ...siteSettings.map((r) => ({ table: "siteSetting", ...r })),
  ];

  if (rows.length === 0) {
    console.log("No matching rows found in PlatformSetting or SiteSetting. Nothing to do.");
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${rows.length} row(s) to inspect:\n`);

  const plan = [];
  for (const row of rows) {
    let status;
    if (!row.value) {
      status = "empty — SKIPPED";
    } else if (looksEncrypted(row.value)) {
      status = "already in encrypted format — SKIPPED (use rotate-encryption-key.mjs if re-keying)";
    } else {
      status = "plaintext — will be encrypted";
      plan.push({ ...row, plaintext: row.value });
    }
    console.log(`  [${row.table}] ${row.key}: ${status}`);
  }
  console.log("");

  if (!apply) {
    console.log(`Dry run complete. ${plan.length} row(s) would be encrypted. Re-run with --apply to write changes.`);
    await prisma.$disconnect();
    return;
  }

  if (plan.length === 0) {
    console.log("Nothing plaintext to encrypt.");
    await prisma.$disconnect();
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of plan) {
        const encrypted = encryptWith(newKey, item.plaintext);
        if (item.table === "platformSetting") {
          await tx.platformSetting.update({ where: { key: item.key }, data: { value: encrypted } });
        } else {
          await tx.siteSetting.update({ where: { key: item.key }, data: { value: encrypted } });
        }
      }

      // Verify: re-read every encrypted row and confirm it decrypts back to
      // the original plaintext under NEW_KEY before letting the transaction commit.
      for (const item of plan) {
        const fresh =
          item.table === "platformSetting"
            ? await tx.platformSetting.findUnique({ where: { key: item.key } })
            : await tx.siteSetting.findUnique({ where: { key: item.key } });

        const roundTrip = decryptWith(newKey, fresh.value);
        if (roundTrip !== item.plaintext) {
          throw new Error(`Verification failed for ${item.table}.${item.key} — round-trip mismatch`);
        }
      }
    });

    console.log(`Encryption applied and verified for ${plan.length} row(s).`);
    console.log("Next: set DB_ENCRYPTION_KEY to NEW_KEY in this environment's Render dashboard (if not already), then redeploy.");
  } catch (err) {
    console.error("Encryption pass FAILED and was rolled back:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
