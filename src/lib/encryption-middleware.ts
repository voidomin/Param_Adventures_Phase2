import { encrypt, decrypt } from "./encryption";

const SENSITIVE_KEYS = new Set([
  "jwt_secret",
  "razorpay_key_secret",
  "razorpay_webhook_secret",
  "smtp_pass",
  "zoho_api_key",
  "resend_api_key",
  "aws_secret_access_key"
]);

/**
 * Registers Prisma middleware to transparently encrypt sensitive setting values
 * on save and decrypt them on read.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerEncryptionMiddleware(client: any) {
  if (typeof client.$use !== "function") {
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client.$use(async (params: any, next: any) => {
    const isSettingModel = params.model === "PlatformSetting" || params.model === "SiteSetting";

    if (isSettingModel) {
      // 1. Intercept write actions (create, update, upsert)
      if (params.action === "create" && params.args?.data) {
        const data = params.args.data;
        if (data.key && SENSITIVE_KEYS.has(data.key) && data.value) {
          data.value = encrypt(data.value);
        }
      } else if (params.action === "update" && params.args?.data) {
        const key = params.args.where?.key;
        if (key && SENSITIVE_KEYS.has(key) && params.args.data.value) {
          params.args.data.value = encrypt(params.args.data.value);
        }
      } else if (params.action === "upsert" && params.args) {
        const key = params.args.where?.key || params.args.create?.key;
        if (key && SENSITIVE_KEYS.has(key)) {
          if (params.args.create && params.args.create.value) {
            params.args.create.value = encrypt(params.args.create.value);
          }
          if (params.args.update && params.args.update.value) {
            params.args.update.value = encrypt(params.args.update.value);
          }
        }
      }

      // 2. Execute query
      const result = await next(params);

      // 3. Intercept read actions and decrypt
      if (result) {
        if (Array.isArray(result)) {
          for (const item of result) {
            if (item && item.key && SENSITIVE_KEYS.has(item.key) && item.value) {
              item.value = decrypt(item.value);
            }
          }
        } else if (typeof result === "object") {
          // For findUnique, findFirst
          if (result.key && SENSITIVE_KEYS.has(result.key) && result.value) {
            result.value = decrypt(result.value);
          }
        }
      }
      return result;
    }

    return next(params);
  });
}
