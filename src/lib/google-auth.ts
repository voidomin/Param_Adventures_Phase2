import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/db";

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

/**
 * Resolves the OAuth Client ID from the "Google Sign-In" admin setting
 * (Settings → Integrations), falling back to NEXT_PUBLIC_GOOGLE_CLIENT_ID
 * for pre-deploy bootstrapping. Read fresh on every call (no module-level
 * caching) so an admin rotating the client ID takes effect immediately,
 * without a redeploy.
 */
async function getClientId(): Promise<string | undefined> {
  const setting = await prisma.platformSetting.findUnique({ where: { key: "google_client_id" } });
  return setting?.value || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
}

/**
 * Verifies a Google Identity Services ID token (the credential returned by
 * the "Sign in with Google" button) against Google's public keys and our
 * client ID. Returns the verified profile, or null if the token is invalid,
 * expired, or was issued for a different client -- the caller should treat
 * that identically to "bad credentials," not a server error.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile | null> {
  const clientId = await getClientId();
  if (!clientId) return null;

  try {
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) return null;

    return {
      googleId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified ?? false,
      name: payload.name ?? payload.email.split("@")[0],
    };
  } catch {
    return null;
  }
}
