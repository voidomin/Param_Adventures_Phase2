import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";

/**
 * PATCH /api/user/profile — Update name and/or phone number
 */
export async function PATCH(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyAccessToken(accessToken);
  if (!payload) {
    return NextResponse.json({ error: "Invalid token." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, phoneNumber } = body;

    if (!name && phoneNumber === undefined) {
      return NextResponse.json(
        {
          error: "Provide at least one field to update (name or phoneNumber).",
        },
        { status: 400 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: payload.userId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(phoneNumber !== undefined
          ? { phoneNumber: phoneNumber?.trim() || null }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("[Profile PATCH] Error:", error);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 },
    );
  }
}
