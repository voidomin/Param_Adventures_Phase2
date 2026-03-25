import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken, generateAccessToken, generateRefreshToken } from "@/lib/auth";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";

const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters long"),
});

export async function PATCH(request: Request) {
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
    });

    if (!user?.password) {
      return NextResponse.json(
        { error: "User not found or no password set" },
        { status: 404 },
      );
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Incorrect current password" },
        { status: 400 },
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password and increment tokenVersion to invalidate other sessions
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword,
        tokenVersion: { increment: 1 }
      },
      include: { role: true },
    });

    const newAccessToken = generateAccessToken(updatedUser.id, updatedUser.role.name, updatedUser.tokenVersion);
    const newRefreshToken = generateRefreshToken(updatedUser.id, updatedUser.tokenVersion);

    const response = NextResponse.json(
      { message: "Password updated successfully" },
      { status: 200 },
    );

    response.cookies.set("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60, // 1 hour
    });

    response.cookies.set("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error("[PASSWORD_UPDATE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update password" },
      { status: 500 },
    );
  }
}
