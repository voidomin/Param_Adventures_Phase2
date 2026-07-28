import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  parseExpiryToSeconds,
} from "@/lib/auth";
import { verifyTwoFactorToken, consumeBackupCode } from "@/lib/two-factor";
import { z } from "zod";
import { emergencyAdminRecovery } from "@/lib/bootstrap";
import { authLimiter } from "@/lib/rate-limiter";
import { logError } from "@/lib/monitoring";

const loginSchema = z.object({
  email: z.email({ message: "Invalid email format" }),
  password: z.string().min(1, { message: "Password is required" }),
  totpCode: z.string().optional(),
});

// Per-account brute-force protection: independent of the IP-based rate limiter
// above, which an attacker can trivially route around by spreading guesses
// across many source addresses. This tracks failed attempts against the
// specific account being targeted instead.
const LOCKOUT_THRESHOLD = 10;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  // 0. Rate Limiting Protection
  const ip = request.headers?.get("x-forwarded-for") || "127.0.0.1";
  const rateLimit = authLimiter.check(ip);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { email, password, totpCode } = parseResult.data;
    const bootstrapToken = request.headers.get("x-bootstrap-token") || "";

    // ─── Emergency Recovery (Disabled in Production) ─────
    let user = null;
    if (bootstrapToken && process.env.NODE_ENV !== "production") {
      user = await emergencyAdminRecovery(email, password, bootstrapToken);
    }

    user ??= await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { role: true },
    });

    if (!user?.password) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    // ─── Check account status ────────────────────────────
    if (user.deletedAt || user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Your account has been suspended." },
        { status: 403 },
      );
    }

    // ─── Per-account lockout check ───────────────────────
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json(
        { error: "Too many failed attempts. This account is temporarily locked. Please try again later." },
        { status: 423 },
      );
    }

    // ─── Verify password ─────────────────────────────────
    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      const failedLoginAttempts = user.failedLoginAttempts + 1;
      const lockingNow = failedLoginAttempts >= LOCKOUT_THRESHOLD;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: lockingNow ? 0 : failedLoginAttempts,
          lockedUntil: lockingNow ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
        },
      });

      return NextResponse.json(
        lockingNow
          ? { error: "Too many failed attempts. This account is temporarily locked. Please try again later." }
          : { error: "Invalid email or password." },
        { status: lockingNow ? 423 : 401 },
      );
    }

    // ─── Two-factor challenge ─────────────────────────────
    if (user.twoFactorEnabled) {
      const isValidTotp = totpCode && user.twoFactorSecret
        ? verifyTwoFactorToken(user.twoFactorSecret, totpCode)
        : false;

      let isValidBackupCode = false;
      let remainingBackupCodes = user.twoFactorBackupCodes;
      if (!isValidTotp && totpCode) {
        const result = consumeBackupCode(totpCode, user.twoFactorBackupCodes);
        isValidBackupCode = result.valid;
        remainingBackupCodes = result.remainingHashedCodes;
      }

      if (!totpCode) {
        return NextResponse.json({ requiresTwoFactor: true }, { status: 200 });
      }

      if (!isValidTotp && !isValidBackupCode) {
        return NextResponse.json(
          { error: "Invalid two-factor authentication code.", requiresTwoFactor: true },
          { status: 401 },
        );
      }

      if (isValidBackupCode) {
        await prisma.user.update({
          where: { id: user.id },
          data: { twoFactorBackupCodes: remainingBackupCodes },
        });
      }
    }

    // ─── Successful login: clear any lockout state ───────
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    // ─── Generate tokens ─────────────────────────────────
    const accessToken = await generateAccessToken(user.id, user.role.name, user.tokenVersion);
    const refreshToken = await generateRefreshToken(user.id, user.tokenVersion);

    // ─── Response with refresh cookie ────────────────────
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
      },
    });

    // We still have to parse expiry strings for cookies maxAge
    // These will fallback to defaults if not in DB
    const settings = await prisma.platformSetting.findMany({
      where: { key: { in: ["session_lifetime_hrs"] } }
    });
    const sessionHrs = (settings.find(s => s.key === "session_lifetime_hrs")?.value || "24").replace(/['"]+/g, "");
    const jwtExpiryStr = `${sessionHrs}h`;
    const refreshExpiryStr = process.env.REFRESH_TOKEN_EXPIRY || "7d";

    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: parseExpiryToSeconds(jwtExpiryStr),
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: parseExpiryToSeconds(refreshExpiryStr),
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    await logError(error instanceof Error ? error : new Error(String(error)), {
      route: "POST /api/auth/login",
    });
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
