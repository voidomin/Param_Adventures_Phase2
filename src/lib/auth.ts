import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db";

// ─── Auth Config Logic ────────────────────────────────────

interface AuthConfig {
  JWT_SECRET: string;
  JWT_EXPIRY: string;
}

let cachedAuthConfig: { config: AuthConfig; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60 * 1000;

/**
 * Fetches the JWT Secret and Expiry from the database (platform settings)
 * with automatic fallback to environment variables.
 */
async function getAuthConfig(): Promise<AuthConfig> {
  const now = Date.now();
  if (cachedAuthConfig && cachedAuthConfig.expiresAt > now) {
    return cachedAuthConfig.config;
  }

  try {
    const settings = await prisma.platformSetting.findMany({
      where: { key: { in: ["jwt_secret", "session_lifetime_hrs"] } },
    });

    const getVal = (key: string) => settings.find(s => s.key === key)?.value;

    const secret = getVal("jwt_secret") || process.env.JWT_SECRET;
    
    if (!secret) {
      throw new Error("CRITICAL: JWT_SECRET is not configured. Access denied for security.");
    }
    
    // session_lifetime_hrs is stored as a number (string-version), e.g. "168"
    const lifetime = getVal("session_lifetime_hrs");
    const expiry = lifetime ? `${lifetime}h` : process.env.JWT_EXPIRY || "1h";

    const config = { JWT_SECRET: secret, JWT_EXPIRY: expiry };
    cachedAuthConfig = { config, expiresAt: now + CACHE_TTL_MS };
    return config;

  } catch {
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      throw new Error("CRITICAL: JWT_SECRET is not configured. Access denied for security.");
    }

    const config = {
      JWT_SECRET: secret,
      JWT_EXPIRY: process.env.JWT_EXPIRY || "1h",
    };
    cachedAuthConfig = { config, expiresAt: now + CACHE_TTL_MS };
    return config;
  }
}

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

export async function generateAccessToken(userId: string, roleName: string, tokenVersion: number, expiresIn?: string): Promise<string> {
  const config = await getAuthConfig();
  return jwt.sign({ userId, roleName, tokenVersion } satisfies TokenPayload, config.JWT_SECRET, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expiresIn: (expiresIn || config.JWT_EXPIRY) as any,
  });
}

/**
 * Helper to parse a JWT expiry string (e.g., "1h", "7d") into seconds for cookie maxAge.
 */
export function parseExpiryToSeconds(expiry: string): number {
  const match = /^(\d+)([dhms])$/.exec(expiry);
  if (!match) return 60 * 60;
  const val = Number.parseInt(match[1]);
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
export async function generateRefreshToken(userId: string, tokenVersion: number, expiresIn?: string): Promise<string> {
  const config = await getAuthConfig();
  const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";
  
  return jwt.sign(
    { userId, type: "refresh", tokenVersion } satisfies RefreshPayload,
    config.JWT_SECRET,
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
    const config = await getAuthConfig();
    const decoded = jwt.verify(token, config.JWT_SECRET) as TokenPayload;
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
export async function verifyRefreshToken(token: string): Promise<RefreshPayload | null> {
  try {
    const config = await getAuthConfig();
    const decoded = jwt.verify(token, config.JWT_SECRET) as RefreshPayload;
    if (!decoded.userId || decoded.type !== "refresh" || decoded.tokenVersion === undefined) return null;

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
