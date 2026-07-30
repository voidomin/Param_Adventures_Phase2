import { prisma } from "@/lib/db";

/**
 * Cloudflare Turnstile verification. Opt-in: if no secret key is configured
 * (admin setting "turnstile_secret_key", falling back to the
 * TURNSTILE_SECRET_KEY env var for pre-deploy bootstrapping), this always
 * passes -- the feature has zero effect until someone deliberately wires up
 * a site key + secret key pair, same pattern as the other optional
 * hardening features (Google Sign-In, admin IP allowlist).
 */
export async function verifyTurnstileToken(token: string | undefined, ip: string): Promise<boolean> {
  const setting = await prisma.platformSetting.findUnique({ where: { key: "turnstile_secret_key" } });
  const secretKey = setting?.value || process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) return true;
  if (!token) return false;

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: secretKey, response: token, remoteip: ip }),
    });
    const data = await response.json();
    return data?.success === true;
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return false;
  }
}
