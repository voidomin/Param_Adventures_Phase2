import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  parseExpiryToSeconds,
} from "@/lib/auth";
import { z } from "zod";
import { ensureBasicSettings, ensureRoles, emergencyAdminRecovery } from "@/lib/bootstrap";

const loginSchema = z.object({
  email: z.email({ message: "Invalid email format" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export async function POST(request: NextRequest) {
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
    const { email, password } = parseResult.data;
    const bootstrapToken = request.headers.get("x-bootstrap-token") || "";

    // ─── Auto-Bootstrap (Idempotent) ────────────────────
    await ensureRoles();
    await ensureBasicSettings();

    // ─── Emergency Recovery ──────────────────────────────
    let user = null;
    if (bootstrapToken) {
      user = await emergencyAdminRecovery(email, password, bootstrapToken);
    }

    if (!user) {
      // ─── Find user (Standard Mode) ──────────────────────
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: { role: true },
      });
    }

    if (!user?.password) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    // ─── Check account status ────────────────────────────
    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Your account has been suspended." },
        { status: 403 },
      );
    }

    // ─── Verify password ─────────────────────────────────
    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

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

    // ─── Response with refresh cookie ────────────────────
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
      },
      accessToken,
    });

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

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
