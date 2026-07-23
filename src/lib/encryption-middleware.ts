import { encrypt, decrypt } from "./encryption";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryHookArgs = { args: any; query: (args: any) => Promise<any> };

const SENSITIVE_KEYS = new Set([
  "jwt_secret",
  "razorpay_key_secret",
  "razorpay_webhook_secret",
  "smtp_pass",
  "zoho_api_key",
  "resend_api_key",
  "aws_secret_access_key",
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function encryptIfSensitive(data: any, keyOverride?: string) {
  if (!data) return;
  const key = data.key ?? keyOverride;
  if (key && SENSITIVE_KEYS.has(key) && data.value) {
    data.value = encrypt(data.value);
  }
}

 
function decryptResult<T extends { key?: string; value?: string } | null>(result: T): T {
  if (result && result.key && SENSITIVE_KEYS.has(result.key) && result.value) {
    result.value = decrypt(result.value);
  }
  return result;
}

/**
 * Prisma Client Extension that transparently encrypts sensitive PlatformSetting/
 * SiteSetting values on write and decrypts them on read.
 *
 * Replaces the old `$use`-based middleware, which silently stopped running once
 * Prisma 7 removed the `$use` API (registerEncryptionMiddleware's own guard —
 * `if (typeof client.$use !== "function") return;` — meant it no-opped on every
 * request with no error, so encryption at rest was never actually happening).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withEncryption<T extends { $extends: (...args: any[]) => any }>(client: T) {
  return client.$extends({
    name: "encryption",
    query: {
      platformSetting: {
        async create({ args, query }: QueryHookArgs) {
          encryptIfSensitive(args.data);
          return query(args);
        },
        async update({ args, query }: QueryHookArgs) {
          encryptIfSensitive(args.data, args.where?.key);
          return query(args);
        },
        async upsert({ args, query }: QueryHookArgs) {
          encryptIfSensitive(args.create);
          encryptIfSensitive(args.update, args.where?.key ?? args.create?.key);
          return query(args);
        },
        async findUnique({ args, query }: QueryHookArgs) {
          return decryptResult(await query(args));
        },
        async findUniqueOrThrow({ args, query }: QueryHookArgs) {
          return decryptResult(await query(args));
        },
        async findFirst({ args, query }: QueryHookArgs) {
          return decryptResult(await query(args));
        },
        async findFirstOrThrow({ args, query }: QueryHookArgs) {
          return decryptResult(await query(args));
        },
        async findMany({ args, query }: QueryHookArgs) {
          const results = await query(args);
          return results.map(decryptResult);
        },
      },
      siteSetting: {
        async create({ args, query }: QueryHookArgs) {
          encryptIfSensitive(args.data);
          return query(args);
        },
        async update({ args, query }: QueryHookArgs) {
          encryptIfSensitive(args.data, args.where?.key);
          return query(args);
        },
        async upsert({ args, query }: QueryHookArgs) {
          encryptIfSensitive(args.create);
          encryptIfSensitive(args.update, args.where?.key ?? args.create?.key);
          return query(args);
        },
        async findUnique({ args, query }: QueryHookArgs) {
          return decryptResult(await query(args));
        },
        async findUniqueOrThrow({ args, query }: QueryHookArgs) {
          return decryptResult(await query(args));
        },
        async findFirst({ args, query }: QueryHookArgs) {
          return decryptResult(await query(args));
        },
        async findFirstOrThrow({ args, query }: QueryHookArgs) {
          return decryptResult(await query(args));
        },
        async findMany({ args, query }: QueryHookArgs) {
          const results = await query(args);
          return results.map(decryptResult);
        },
      },
    },
  });
}
