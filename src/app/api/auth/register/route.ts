import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
  parseExpiryToSeconds,
} from "@/lib/auth";
import { sendWelcomeEmail, sendVerificationEmail } from "@/lib/email";
import { z } from "zod";
import { authLimiter } from "@/lib/rate-limiter";
import { passwordSchema } from "@/lib/validators/auth.schema";
import { CURRENT_TERMS_VERSION } from "@/lib/constants/terms";
import { verifyTurnstileToken } from "@/lib/turnstile";
import crypto from "node:crypto";

const EMAIL_VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

const registerSchema = z.object({
  email: z.email({ message: "Invalid email format" }),
  password: passwordSchema,
  name: z.string().min(1, { message: "Name is required" }),
  acceptedTerms: z.literal(true, { message: "You must accept the Terms & Privacy Policy" }),
  turnstileToken: z.string().optional(),
});

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
    const parseResult = registerSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { email, password, name, turnstileToken } = parseResult.data;

    if (!(await verifyTurnstileToken(turnstileToken, ip))) {
      return NextResponse.json({ error: "Failed bot-protection check. Please try again." }, { status: 400 });
    }

    // ─── Check Registration Status ───────────────────────
    const regSetting = await prisma.platformSetting.findUnique({ where: { key: "registration_enabled" } });
    if (regSetting?.value === "false") {
      return NextResponse.json(
        { error: "New user registrations are currently disabled by the administrator." },
        { status: 403 },
      );
    }

    // ─── Check for existing user ─────────────────────────
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    // ─── Get the REGISTERED_USER role ────────────────────
    const defaultRole = await prisma.role.findUnique({
      where: { name: "REGISTERED_USER" },
    });

    if (!defaultRole) {
      console.error("REGISTERED_USER role not found. Run the seed script.");
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500 },
      );
    }

    // ─── Create user ─────────────────────────────────────
    const hashedPassword = await hashPassword(password);
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name: name.trim(),
        roleId: defaultRole.id,
        emailVerificationToken,
        emailVerificationTokenExpiry: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_EXPIRY_MS),
        termsVersion: CURRENT_TERMS_VERSION,
        acceptedTermsAt: new Date(),
      },
      include: { role: true },
    });

    // ─── Generate tokens ─────────────────────────────────
    const accessToken = await generateAccessToken(user.id, user.role.name, user.tokenVersion);
    const refreshToken = await generateRefreshToken(user.id, user.tokenVersion);

    // ─── Set refresh token as HTTP-only cookie ───────────
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role.name,
        },
      },
      { status: 201 },
    );

    // We still have to parse expiry strings for cookies maxAge
    // These will fallback to defaults if not in DB
    const pSettings = await prisma.platformSetting.findMany({
      where: { key: { in: ["session_lifetime_hrs"] } }
    });
    const sHrs = (pSettings.find(s => s.key === "session_lifetime_hrs")?.value || "24").replace(/['"]+/g, "");
    const jExpiryStr = `${sHrs}h`;
    const rExpiryStr = process.env.REFRESH_TOKEN_EXPIRY || "7d";

    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: parseExpiryToSeconds(jExpiryStr),
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: parseExpiryToSeconds(rExpiryStr),
    });

    // Send welcome email (fire-and-forget)
    sendWelcomeEmail({
      userName: user.name,
      userEmail: user.email,
    }).catch((err) => console.error("Welcome email error:", err));

    // Send verification email (fire-and-forget)
    const siteSettings = await prisma.siteSetting.findMany({ where: { key: "app_url" } });
    const baseUrl =
      siteSettings[0]?.value ||
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get("origin") ||
      "https://localhost:3000";
    const verifyLink = `${baseUrl}/verify-email?token=${emailVerificationToken}`;

    sendVerificationEmail({
      userName: user.name,
      userEmail: user.email,
      verifyLink,
    }).catch((err) => console.error("Verification email error:", err));

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
