import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";

/**
 * Verify the request has a valid access token and (optionally) the required permission.
 * Returns the user object if authorized, or a NextResponse error if not.
 */
export async function authorizeRequest(
  request: NextRequest,
  requiredPermission?: string | string[],
): Promise<
  | { authorized: true; userId: string; roleName: string }
  | { authorized: false; response: NextResponse }
> {
  const authHeader = request.headers.get("authorization");
  const cookieToken = request.cookies.get("accessToken")?.value;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : cookieToken;

  if (!token) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      ),
    };
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 },
      ),
    };
  }

  // If a permission is required, check it
  if (requiredPermission) {
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

    if (!user || user.deletedAt || user.status !== "ACTIVE") {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "User not found or inactive." },
          { status: 403 },
        ),
      };
    }

    const hasPermission =
      user.role.name === "SUPER_ADMIN" ||
      user.role.permissions.some((rp) => {
        if (Array.isArray(requiredPermission)) {
          return requiredPermission.includes(rp.permission.key);
        }
        return rp.permission.key === requiredPermission;
      });

    if (!hasPermission) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Insufficient permissions." },
          { status: 403 },
        ),
      };
    }
  }

  return {
    authorized: true,
    userId: payload.userId,
    roleName: payload.roleName,
  };
}
