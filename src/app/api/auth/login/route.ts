import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  parseExpiryToSeconds,
} from "@/lib/auth";
import { z } from "zod";
import { emergencyAdminRecovery } from "@/lib/bootstrap";

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

    // ─── Emergency Recovery ──────────────────────────────
    let user = null;
    if (bootstrapToken) {
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
      accessToken,
    });

    // We still have to parse expiry strings for cookies maxAge
    // These will fallback to defaults if not in DB
    const settings = await prisma.platformSetting.findMany({
      where: { key: { in: ["session_lifetime_hrs"] } }
    });
    const sessionHrs = settings.find(s => s.key === "session_lifetime_hrs")?.value || "1";
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
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
