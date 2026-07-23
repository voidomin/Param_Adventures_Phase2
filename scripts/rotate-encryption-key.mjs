import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import crypto from "node:crypto";
import readline from "node:readline/promises";

// ─── Rotates DB_ENCRYPTION_KEY for encrypted PlatformSetting/SiteSetting rows ───
//
// Usage:
//   OLD_KEY=<current key or leave unset to use the hardcoded fallback> \
//   NEW_KEY=<new random key> \
//   DATABASE_URL=<target DB> \
//   node scripts/rotate-encryption-key.mjs [--apply]
//
// Without --apply, runs in dry-run mode: reports which rows would change,
// verifies the OLD_KEY can actually decrypt them, but writes nothing.
//
// With --apply, re-encrypts each affected row under NEW_KEY inside a
// transaction, then re-reads and decrypts every row with NEW_KEY to confirm
// round-trip integrity before committing. Aborts the whole transaction if
// any row fails verification.

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
const FALLBACK_KEY_RAW = "default-fallback-key-should-be-changed-in-prod";

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
    throw new Error("Value is not in iv:encrypted:authTag format (plaintext or already corrupted)");
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

async function main() {
  const apply = process.argv.includes("--apply");

  const oldKeyRaw = process.env.OLD_KEY || FALLBACK_KEY_RAW;
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
  if (oldKeyRaw === newKeyRaw) {
    console.error("ERROR: NEW_KEY must be different from OLD_KEY.");
    process.exit(1);
  }

  const oldKey = deriveKey(oldKeyRaw);
  const newKey = deriveKey(newKeyRaw);

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log(`Mode: ${apply ? "APPLY (will write changes)" : "DRY RUN (no changes will be written)"}`);
  console.log(`Target DB: ${databaseUrl.replace(/:[^:@]+@/, ":****@")}`);
  console.log("");

  if (apply) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(
      "Type EXACTLY 'rotate' to confirm you have a fresh backup of this database and want to proceed: ",
    );
    rl.close();
    if (answer.trim() !== "rotate") {
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
    console.log("No matching rows found in PlatformSetting or SiteSetting. Nothing to rotate.");
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${rows.length} row(s) to inspect:\n`);

  const plan = [];
  for (const row of rows) {
    let status;
    let plaintext = null;
    try {
      plaintext = decryptWith(oldKey, row.value);
      status = "decryptable with OLD_KEY — will be rotated";
      plan.push({ ...row, plaintext });
    } catch (err) {
      status = `NOT decryptable with OLD_KEY (${err.message}) — will be SKIPPED`;
    }
    console.log(`  [${row.table}] ${row.key}: ${status}`);
  }
  console.log("");

  if (!apply) {
    console.log(`Dry run complete. ${plan.length} row(s) would be rotated. Re-run with --apply to write changes.`);
    await prisma.$disconnect();
    return;
  }

  if (plan.length === 0) {
    console.log("Nothing decryptable with OLD_KEY — nothing to apply.");
    await prisma.$disconnect();
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of plan) {
        const reEncrypted = encryptWith(newKey, item.plaintext);
        if (item.table === "platformSetting") {
          await tx.platformSetting.update({ where: { key: item.key }, data: { value: reEncrypted } });
        } else {
          await tx.siteSetting.update({ where: { key: item.key }, data: { value: reEncrypted } });
        }
      }

      // Verify: re-read every rotated row and confirm it decrypts back to the
      // original plaintext under NEW_KEY before letting the transaction commit.
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

    console.log(`Rotation applied and verified for ${plan.length} row(s).`);
    console.log("Next: set DB_ENCRYPTION_KEY to NEW_KEY in this environment's Render dashboard, then redeploy.");
  } catch (err) {
    console.error("Rotation FAILED and was rolled back:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
