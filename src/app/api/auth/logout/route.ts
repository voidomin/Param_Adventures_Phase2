import { NextRequest, NextResponse } from "next/server";
import { revokeSessionFromToken, getUserIdFromToken } from "@/lib/auth";
import { logActivity } from "@/lib/audit-logger";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("refreshToken")?.value;
  const accessToken = request.cookies.get("accessToken")?.value;
  const token = refreshToken || accessToken;

  // Bump tokenVersion so any copy of this user's token (stolen, or just left
  // signed-in on another device) stops working the moment they log out here,
  // instead of staying valid until natural expiry.
  await revokeSessionFromToken(token);

  const userId = await getUserIdFromToken(token);
  if (userId) {
    await logActivity("LOGOUT", userId, "User", userId);
  }

  const response = NextResponse.json({ message: "Logged out successfully." });

  // Clear both cookies
  response.cookies.set("accessToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set("refreshToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  return response;
}
