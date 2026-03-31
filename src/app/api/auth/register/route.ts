import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
  parseExpiryToSeconds,
} from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";
import { z } from "zod";

const registerSchema = z.object({
  email: z.email({ message: "Invalid email format" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  name: z.string().min(1, { message: "Name is required" }),
});

export async function POST(request: NextRequest) {
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
    const { email, password, name } = parseResult.data;

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

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name: name.trim(),
        roleId: defaultRole.id,
      },
      include: { role: true },
    });

    // ─── Fetch Dynamic Settings ─────────────────────────
    const settings = await prisma.platformSetting.findMany({
      where: { key: { in: ["jwt_expiry", "refresh_token_expiry"] } }
    });
    const getVal = (key: string, fallback: string) => settings.find(s => s.key === key)?.value || fallback;

    const jwtExpiry = getVal("jwt_expiry", "1h");
    const refreshExpiry = getVal("refresh_token_expiry", "7d");

    // ─── Generate tokens ─────────────────────────────────
    const accessToken = generateAccessToken(user.id, user.role.name, user.tokenVersion, jwtExpiry);
    const refreshToken = generateRefreshToken(user.id, user.tokenVersion, refreshExpiry);

    // ─── Set refresh token as HTTP-only cookie ───────────
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role.name,
        },
        accessToken,
      },
      { status: 201 },
    );

    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: parseExpiryToSeconds(jwtExpiry),
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: parseExpiryToSeconds(refreshExpiry),
    });

    // Send welcome email (fire-and-forget)
    sendWelcomeEmail({
      userName: user.name,
      userEmail: user.email,
    }).catch((err) => console.error("Welcome email error:", err));

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
