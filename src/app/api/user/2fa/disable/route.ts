import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { verifyPassword } from "@/lib/auth";
import { verifyTwoFactorToken, consumeBackupCode } from "@/lib/two-factor";
import { logActivity } from "@/lib/audit-logger";
import { z } from "zod";

const disableSchema = z.object({
  password: z.string().optional(),
  code: z.string().optional(),
});

/**
 * POST /api/user/2fa/disable
 *
 * Requires re-proving account ownership before turning 2FA off -- same
 * reasoning as the account-deletion flow: this is a sensitive,
 * hard-to-reverse-the-consequences-of action, so a stolen unlocked session
 * alone shouldn't be enough to weaken account security. Accounts with a
 * password confirm via password; Google-only accounts (no password set)
 * confirm via a current 2FA code instead, since that's the only secondary
 * factor they have.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const parseResult = disableSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { password, code } = parseResult.data;

    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.password) {
      if (!password || !(await verifyPassword(password, user.password))) {
        return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
      }
    } else {
      const isValidTotp = code && user.twoFactorSecret ? verifyTwoFactorToken(user.twoFactorSecret, code) : false;
      const isValidBackupCode = !isValidTotp && code
        ? consumeBackupCode(code, user.twoFactorBackupCodes).valid
        : false;
      if (!isValidTotp && !isValidBackupCode) {
        return NextResponse.json({ error: "Invalid two-factor code." }, { status: 401 });
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      },
    });

    await logActivity("TWO_FACTOR_DISABLED", user.id, "User", user.id, {});

    return NextResponse.json({ message: "Two-factor authentication disabled." });
  } catch (error) {
    console.error("2FA disable error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
