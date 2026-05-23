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
        { message: "If an account exists, a reset link has been sent." },
        { status: 200 },
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

    // Determine base URL dynamically from settings or headers
    const siteSettings = await prisma.siteSetting.findMany({
      where: { key: "app_url" }
    });
    
    const baseUrl =
      siteSettings[0]?.value ||
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get("origin") ||
      "https://localhost:3000";
      
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

    console.error("[AUTH] Forgot Password error:", error);
    if (error instanceof Error && error.stack) console.error(error.stack);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
