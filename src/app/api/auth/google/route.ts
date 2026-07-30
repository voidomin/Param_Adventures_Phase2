import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  generateAccessToken,
  generateRefreshToken,
  parseExpiryToSeconds,
} from "@/lib/auth";
import { verifyGoogleIdToken } from "@/lib/google-auth";
import { verifyTwoFactorToken, consumeBackupCode } from "@/lib/two-factor";
import { z } from "zod";
import { authLimiter } from "@/lib/rate-limiter";
import { CURRENT_TERMS_VERSION } from "@/lib/constants/terms";

const googleLoginSchema = z.object({
  credential: z.string().min(1, "Missing Google credential"),
  totpCode: z.string().optional(),
});

interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

async function findOrCreateGoogleUser(profile: GoogleProfile) {
  const existingUser = await prisma.user.findUnique({
    where: { googleId: profile.googleId },
    include: { role: true },
  });
  if (existingUser) return existingUser;

  const existingByEmail = await prisma.user.findUnique({
    where: { email: profile.email.toLowerCase().trim() },
    include: { role: true },
  });

  if (existingByEmail) {
    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        googleId: profile.googleId,
        isVerified: existingByEmail.isVerified || profile.emailVerified,
      },
      include: { role: true },
    });
  }

  const defaultRole = await prisma.role.findUnique({ where: { name: "REGISTERED_USER" } });
  if (!defaultRole) {
    console.error("REGISTERED_USER role not found. Run the seed script.");
    return null;
  }

  return prisma.user.create({
    data: {
      email: profile.email.toLowerCase().trim(),
      name: profile.name,
      googleId: profile.googleId,
      isVerified: profile.emailVerified,
      roleId: defaultRole.id,
      termsVersion: CURRENT_TERMS_VERSION,
      acceptedTermsAt: new Date(),
    },
    include: { role: true },
  });
}

async function processTwoFactorChallenge(user: { id: string; twoFactorEnabled: boolean; twoFactorSecret: string | null; twoFactorBackupCodes: string[] }, totpCode?: string) {
  if (!user.twoFactorEnabled) return { ok: true };
  if (!totpCode) return { ok: false, response: NextResponse.json({ requiresTwoFactor: true }, { status: 200 }) };

  const isValidTotp = user.twoFactorSecret ? verifyTwoFactorToken(user.twoFactorSecret, totpCode) : false;
  let isValidBackupCode = false;
  let remainingBackupCodes = user.twoFactorBackupCodes;

  if (!isValidTotp) {
    const result = consumeBackupCode(totpCode, user.twoFactorBackupCodes);
    isValidBackupCode = result.valid;
    remainingBackupCodes = result.remainingHashedCodes;
  }

  if (!isValidTotp && !isValidBackupCode) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid two-factor authentication code.", requiresTwoFactor: true },
        { status: 401 }
      ),
    };
  }

  if (isValidBackupCode) {
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorBackupCodes: remainingBackupCodes },
    });
  }

  return { ok: true };
}

export async function POST(request: NextRequest) {
  const ip = request.headers?.get("x-forwarded-for") || "127.0.0.1";
  const rateLimit = authLimiter.check(ip);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const parseResult = googleLoginSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { credential, totpCode } = parseResult.data;

    const profile = await verifyGoogleIdToken(credential);
    if (!profile) {
      return NextResponse.json({ error: "Invalid Google credential." }, { status: 401 });
    }

    const user = await findOrCreateGoogleUser(profile);
    if (!user) {
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    if (user.deletedAt || user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Your account has been suspended." }, { status: 403 });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json(
        { error: "Too many failed attempts. This account is temporarily locked. Please try again later." },
        { status: 423 },
      );
    }

    const twoFactorRes = await processTwoFactorChallenge(user, totpCode);
    if (!twoFactorRes.ok) return twoFactorRes.response!;

    const accessToken = await generateAccessToken(user.id, user.role.name, user.tokenVersion);
    const refreshToken = await generateRefreshToken(user.id, user.tokenVersion);

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
      },
    });

    const settings = await prisma.platformSetting.findMany({
      where: { key: { in: ["session_lifetime_hrs"] } },
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
    console.error("Google login error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
