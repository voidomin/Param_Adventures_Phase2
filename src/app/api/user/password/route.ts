import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken, generateAccessToken, generateRefreshToken, parseExpiryToSeconds } from "@/lib/auth";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";

const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters long"),
});

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = passwordUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { currentPassword, newPassword } = parseResult.data;

    // Fetch the user to get the current password hash
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { role: true },
    });

    if (!user?.password) {
      return NextResponse.json(
        { error: "User or password not found" },
        { status: 404 },
      );
    }

    // Verify current password
    const isCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isCorrect) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 },
      );
    }

    // Hash the new password and update user (incrementing tokenVersion to invalidate old tokens)
    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: newHashedPassword,
        tokenVersion: { increment: 1 },
      },
      include: { role: true },
    });

    // ─── Token Rotation ──────────────────────────────────
    const expirySetting = await prisma.platformSetting.findUnique({ where: { key: "jwt_expiry" } });
    const refreshExpirySetting = await prisma.platformSetting.findUnique({ where: { key: "refresh_token_expiry" } });
    
    const accessToken = generateAccessToken(updatedUser.id, updatedUser.role.name, updatedUser.tokenVersion, expirySetting?.value);
    const refreshToken = generateRefreshToken(updatedUser.id, updatedUser.tokenVersion, refreshExpirySetting?.value);

    const response = NextResponse.json({ message: "Password updated successfully" });

    // Set new tokens in cookies
    const accessTokenExpiry = parseExpiryToSeconds(expirySetting?.value || "15m");
    const refreshTokenExpiry = parseExpiryToSeconds(refreshExpirySetting?.value || "7d");

    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: accessTokenExpiry,
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: refreshTokenExpiry,
    });

    return response;
  } catch (error) {
    console.error("[PASSWORD_UPDATE_ERROR]", error);
    // In production, we don't want to expose internal errors, but for testing debugging we might.
    // However, we'll keep it standard here.
    return NextResponse.json(
      { error: "Failed to update password" },
      { status: 500 },
    );
  }
}
