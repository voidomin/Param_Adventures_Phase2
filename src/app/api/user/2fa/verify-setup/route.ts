import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { verifyTwoFactorToken } from "@/lib/two-factor";
import { logActivity } from "@/lib/audit-logger";
import { z } from "zod";

const verifySetupSchema = z.object({
  code: z.string().min(6, "Enter the 6-digit code from your authenticator app"),
});

/**
 * POST /api/user/2fa/verify-setup
 *
 * Confirms enrollment by requiring one valid code from the secret issued in
 * /api/user/2fa/setup before actually turning twoFactorEnabled on -- this
 * proves the user's authenticator app is correctly configured before we
 * start requiring it at every login.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const parseResult = verifySetupSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user?.twoFactorSecret) {
      return NextResponse.json(
        { error: "No pending two-factor setup found. Start setup again." },
        { status: 409 },
      );
    }

    if (!verifyTwoFactorToken(user.twoFactorSecret, parseResult.data.code)) {
      return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true },
    });

    await logActivity("TWO_FACTOR_ENABLED", user.id, "User", user.id, {});

    return NextResponse.json({ message: "Two-factor authentication enabled." });
  } catch (error) {
    console.error("2FA verify-setup error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
