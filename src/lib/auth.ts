import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-dev-secret";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "15m";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";

// ─── Password Hashing ───────────────────────────────────

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── JWT Tokens ──────────────────────────────────────────

export interface TokenPayload {
  userId: string;
  roleName: string;
}

export interface RefreshPayload {
  userId: string;
  type: "refresh";
}

/**
 * Generate a short-lived access token (default: 15 minutes).
 */
export function generateAccessToken(userId: string, roleName: string): string {
  return jwt.sign({ userId, roleName } satisfies TokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY as any,
  });
}

/**
 * Generate a long-lived refresh token (default: 7 days).
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: "refresh" } satisfies RefreshPayload,
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY as any },
  );
}

/**
 * Verify and decode an access token.
 * Returns the payload or null if invalid/expired.
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    if (!decoded.userId || !decoded.roleName) return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Verify and decode a refresh token.
 * Returns the payload or null if invalid/expired.
 */
export function verifyRefreshToken(token: string): RefreshPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as RefreshPayload;
    if (!decoded.userId || decoded.type !== "refresh") return null;
    return decoded;
  } catch {
    return null;
  }
}
