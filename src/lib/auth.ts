import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-dev-secret";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "1h";
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
  tokenVersion: number;
}

export interface RefreshPayload {
  userId: string;
  type: "refresh";
  tokenVersion: number;
}

export function generateAccessToken(userId: string, roleName: string, tokenVersion: number, expiresIn?: string): string {
  return jwt.sign({ userId, roleName, tokenVersion } satisfies TokenPayload, JWT_SECRET, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expiresIn: (expiresIn || JWT_EXPIRY) as any,
  });
}

/**
 * Helper to parse a JWT expiry string (e.g., "1h", "7d") into seconds for cookie maxAge.
 */
export function parseExpiryToSeconds(expiry: string): number {
  const match = expiry.match(/^(\d+)([dhms])$/);
  if (!match) return 60 * 60;
  const val = parseInt(match[1]);
  const unit = match[2];
  switch (unit) {
    case "d": return val * 24 * 60 * 60;
    case "h": return val * 60 * 60;
    case "m": return val * 60;
    case "s": return val;
    default: return 60 * 60;
  }
}

/**
 * Generate a long-lived refresh token (default: 7 days).
 */
export function generateRefreshToken(userId: string, tokenVersion: number, expiresIn?: string): string {
  return jwt.sign(
    { userId, type: "refresh", tokenVersion } satisfies RefreshPayload,
    JWT_SECRET,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { expiresIn: (expiresIn || REFRESH_TOKEN_EXPIRY) as any },
  );
}


/**
 * Verify and decode an access token, checking the database for tokenVersion validity.
 * Returns the payload or null if invalid/expired/revoked.
 */
export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    if (!decoded.userId || !decoded.roleName || decoded.tokenVersion === undefined) return null;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { status: true, tokenVersion: true, deletedAt: true },
    });

    if (!user || user.deletedAt || user.status !== "ACTIVE" || user.tokenVersion !== decoded.tokenVersion) {
      return null;
    }

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
