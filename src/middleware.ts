import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for route protection.
 * Will be expanded with custom JWT verification once auth is implemented.
 * Currently allows all routes through for local UI development.
 */
export function middleware(request: NextRequest) {
  // TODO: Add JWT token verification from cookies
  // For now, all routes are public for local development
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
