import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "node:crypto";
import { z } from "zod";
import { sendResetPasswordEmail } from "@/lib/email";

const forgotPasswordSchema = z.object({
  email: z.email("Invalid email address"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = forgotPasswordSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { email } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Return 200 even if user doesn't exist to prevent email enumeration
      return NextResponse.json(
        { message: "If an account exists, a reset link has been sent." },
        { status: 200 },
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Account is suspended or inactive." },
        { status: 403 },
      );
    }

    // Generate secure token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to DB
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Determine base URL dynamically or fallback to localhost
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get("origin") ||
      "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

    // Send real email
    await sendResetPasswordEmail({
      userName: user.name || "Adventurer",
      userEmail: user.email,
      resetLink,
    });

    console.log(`[AUTH] Password Reset Link for ${user.email} sent via Zoho.`);

    return NextResponse.json(
      { message: "If an account exists, a reset link has been sent." },
      { status: 200 },
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof (error as { message: unknown }).message === "string"
          ? (error as { message: string }).message
          : "Unknown error";

    console.error("[AUTH] Forgot Password error:", error);
    if (error instanceof Error && error.stack) console.error(error.stack);
    return NextResponse.json(
      {
        error: "Internal server error.",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}
