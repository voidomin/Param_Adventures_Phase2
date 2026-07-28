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

const googleLoginSchema = z.object({
  credential: z.string().min(1, "Missing Google credential"),
  totpCode: z.string().optional(),
});

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

    let user = await prisma.user.findUnique({
      where: { googleId: profile.googleId },
      include: { role: true },
    });

    if (!user) {
      const existingByEmail = await prisma.user.findUnique({
        where: { email: profile.email.toLowerCase().trim() },
        include: { role: true },
      });

      if (existingByEmail) {
        // Link this Google identity to the existing account instead of
        // creating a duplicate -- same email, same person.
        user = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            googleId: profile.googleId,
            isVerified: existingByEmail.isVerified || profile.emailVerified,
          },
          include: { role: true },
        });
      } else {
        const defaultRole = await prisma.role.findUnique({ where: { name: "REGISTERED_USER" } });
        if (!defaultRole) {
          console.error("REGISTERED_USER role not found. Run the seed script.");
          return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
        }

        user = await prisma.user.create({
          data: {
            email: profile.email.toLowerCase().trim(),
            name: profile.name,
            googleId: profile.googleId,
            isVerified: profile.emailVerified,
            roleId: defaultRole.id,
          },
          include: { role: true },
        });
      }
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
