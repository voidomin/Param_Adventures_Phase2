import { OAuth2Client } from "google-auth-library";

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

let cachedClient: OAuth2Client | null = null;

function getClient(): OAuth2Client {
  cachedClient ??= new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  return cachedClient;
}

/**
 * Verifies a Google Identity Services ID token (the credential returned by
 * the "Sign in with Google" button) against Google's public keys and our
 * client ID. Returns the verified profile, or null if the token is invalid,
 * expired, or was issued for a different client -- the caller should treat
 * that identically to "bad credentials," not a server error.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile | null> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) return null;

  try {
    const ticket = await getClient().verifyIdToken({ idToken, audience: clientId });
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
