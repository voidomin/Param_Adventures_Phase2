import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { generateTwoFactorSecret, generateBackupCodes } from "@/lib/two-factor";

/**
 * POST /api/user/2fa/setup
 *
 * Starts 2FA enrollment: generates a new secret and backup codes and stores
 * them, but leaves twoFactorEnabled false until the user confirms they can
 * actually generate a valid code via /api/user/2fa/verify-setup. Returns the
 * plaintext secret/backup codes exactly once -- they're never retrievable
 * again after this response.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: "Two-factor authentication is already enabled." },
        { status: 409 },
      );
    }

    const { plainSecret, encryptedSecret, provisioningUri, qrCodeDataUrl } = await generateTwoFactorSecret(user.email);
    const { plainCodes, hashedCodes } = generateBackupCodes();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: encryptedSecret,
        twoFactorBackupCodes: hashedCodes,
        twoFactorEnabled: false,
      },
    });

    return NextResponse.json({
      secret: plainSecret,
      provisioningUri,
      qrCodeDataUrl,
      backupCodes: plainCodes,
    });
  } catch (error) {
    console.error("2FA setup error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
