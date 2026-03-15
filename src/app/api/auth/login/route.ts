import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/auth";
import { z } from "zod";

const loginSchema = z.object({
  email: z.email("Invalid email format"),
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

    // ─── Find user ───────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { role: true },
    });

    if (!user || !user.password) {
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

    // ─── Generate tokens ─────────────────────────────────
    const accessToken = generateAccessToken(user.id, user.role.name, user.tokenVersion);
    const refreshToken = generateRefreshToken(user.id, user.tokenVersion);

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
      maxAge: 60 * 60, // 1 hour
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
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
