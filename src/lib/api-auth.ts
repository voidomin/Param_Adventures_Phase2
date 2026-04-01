import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { SYSTEM_ADMIN_EMAILS } from "@/lib/constants/auth";

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
  try {
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

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Invalid or expired token." },
          { status: 401 },
        ),
      };
    }

    // Always fetch the user to check tokenVersion and active status
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

    // Compare token versions to detect revoked sessions
    if (user.tokenVersion !== payload.tokenVersion) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Session expired. Please log in again." },
          { status: 401 },
        ),
      };
    }

    // If a permission is required, check it
    if (requiredPermission) {

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
  } catch (error) {
    console.error("Authorize request error:", error);
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Internal authorization error." },
        { status: 500 },
      ),
    };
  }
}

/**
 * Highest security authorization level for System Configuration.
 * Requires BOTH a valid SUPER_ADMIN session AND an email from the whitelist.
 */
export async function authorizeSystemRequest(request: NextRequest): Promise<
  | { authorized: true; userId: string; roleName: string }
  | { authorized: false; response: NextResponse }
> {
  // 1. First, check standard SUPER_ADMIN authorization
  const auth = await authorizeRequest(request, "system:config");
  if (!auth.authorized) {
    return auth;
  }

  // 2. Fetch the user email to check against whitelist
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { email: true },
  });

  if (!user || !SYSTEM_ADMIN_EMAILS.includes(user.email)) {
    console.warn(`🛑 Unauthorized System Config access attempt by: ${user?.email || "unknown"}`);
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Access Denied: You do not have permission to manage system-level settings." },
        { status: 403 },
      ),
    };
  }

  return auth;
}
