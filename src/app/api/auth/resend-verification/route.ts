import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "node:crypto";

const EMAIL_VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.isVerified) {
      return NextResponse.json({ message: "Email already verified." }, { status: 200 });
    }

    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken,
        emailVerificationTokenExpiry: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_EXPIRY_MS),
      },
    });

    const appUrlSettings = await prisma.platformSetting.findMany({ where: { key: "app_url" } });
    const baseUrl =
      appUrlSettings[0]?.value ||
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get("origin") ||
      "https://localhost:3000";
    const verifyLink = `${baseUrl}/verify-email?token=${emailVerificationToken}`;

    await sendVerificationEmail({
      userName: user.name || "Adventurer",
      userEmail: user.email,
      verifyLink,
    });

    return NextResponse.json({ message: "Verification email sent." }, { status: 200 });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
