import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // ─── Extract token from Authorization header or Cookie ─────────
    const authHeader = request.headers.get("authorization");
    let token = "";

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      token = request.cookies.get("accessToken")?.value || "";
    }

    if (!token) {
      return NextResponse.json(
        { error: "No access token provided." },
        { status: 401 },
      );
    }
    const payload = await verifyAccessToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 },
      );
    }

    // ─── Fetch user from database ────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Account is suspended." },
        { status: 403 },
      );
    }

    // ─── Return user profile with permissions ────────────
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl,
        gender: user.gender,
        age: user.age,
        bloodGroup: user.bloodGroup,
        emergencyContactName: user.emergencyContactName,
        emergencyContactNumber: user.emergencyContactNumber,
        emergencyRelationship: user.emergencyRelationship,
        isVerified: user.isVerified,
        role: user.role.name,
        permissions: user.role.permissions.map((rp) => rp.permission.key),
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
