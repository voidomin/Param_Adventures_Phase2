/**
 * ONE-TIME Bootstrap Endpoint
 *
 * This endpoint runs the database seed to initialize roles, permissions, and super-admin users.
 * It's ONLY meant to be called once after initial deployment on a fresh database.
 *
 * Security:
 * - Requires BOOTSTRAP_TOKEN environment variable for authorization
 * - Token must match exactly for execution
 * - Logs all bootstrap activities
 * - Checks if roles already exist (prevents re-running if already seeded)
 *
 * Usage:
 * 1. Set BOOTSTRAP_TOKEN in your Render environment variables (any random string)
 * 2. Call: https://your-app.onrender.com/api/admin/bootstrap?token=YOUR_BOOTSTRAP_TOKEN
 * 3. Wait for seed to complete (logs will show init progress)
 * 4. Verify admin accounts created and can log in
 * 5. DELETE the BOOTSTRAP_TOKEN from environment variables to prevent abuse
 */

import { NextRequest, NextResponse } from "next/server";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const execPromise = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const providedToken = url.searchParams.get("token");
    const mode = url.searchParams.get("mode");
    const bootstrapToken = process.env.BOOTSTRAP_TOKEN;

    // 1. Validate authorization token
    if (!bootstrapToken) {
      return NextResponse.json(
        {
          error: "BOOTSTRAP_TOKEN not configured in environment variables",
          message:
            "Set BOOTSTRAP_TOKEN in Render environment to enable bootstrap endpoint",
        },
        { status: 500 },
      );
    }

    if (!providedToken || providedToken !== bootstrapToken) {
      return NextResponse.json(
        {
          error: "Unauthorized: Invalid or missing bootstrap token",
          message: "Provide correct token: ?token=YOUR_BOOTSTRAP_TOKEN",
        },
        { status: 401 },
      );
    }

    // Optional maintenance mode for free-tier hosting without shell access.
    if (mode === "repair-schema") {
      console.log("[BOOTSTRAP] Starting schema repair via prisma db push...");
      const startTime = Date.now();

      const { stdout, stderr } = await execPromise(
        "npx prisma db push --skip-generate",
        {
          env: process.env,
        },
      );

      const duration = Date.now() - startTime;

      const [rolesCount, bookingsCount] = await Promise.all([
        prisma.role.count(),
        prisma.booking.count(),
      ]);

      return NextResponse.json(
        {
          success: true,
          message: "Schema repair completed successfully",
          timestamp: new Date().toISOString(),
          duration: `${duration}ms`,
          mode: "repair-schema",
          diagnostics: {
            rolesCount,
            bookingsCount,
            prismaOutput: stdout?.slice(0, 1200) || null,
            prismaWarnings: stderr?.slice(0, 1200) || null,
          },
          nextSteps: [
            "1. Refresh dashboard and bookings pages",
            "2. If issue persists, redeploy once from Render dashboard",
            "3. Remove BOOTSTRAP_TOKEN after verification",
          ],
        },
        { status: 200 },
      );
    }

    // 2. Check if already bootstrapped (prevent re-running)
    const existingRoles = await prisma.role.count();
    if (existingRoles > 0) {
      return NextResponse.json(
        {
          warning: "Database already bootstrapped",
          message: `Found ${existingRoles} existing roles. Seed was already run.`,
          rolesCount: existingRoles,
          timestamp: new Date().toISOString(),
        },
        { status: 200 },
      );
    }

    // 3. Run the seed script directly
    console.log("[BOOTSTRAP] Starting database seed via direct import...");
    const startTime = Date.now();

    // Import the seed logic (mjs)
    // @ts-expect-error - Importing .mjs in .ts
    const { main: runSeed } = await import("../../../../../prisma/seed.mjs");

    await runSeed(prisma);

    const duration = Date.now() - startTime;

    // 4. Verify seed completed by checking role count
    const finalRoleCount = await prisma.role.count();
    const finalPermissionCount = await prisma.permission.count();
    const superAdminCount = await prisma.user.count({
      where: {
        role: {
          name: "SUPER_ADMIN",
        },
      },
    });

    // 5. Return success response
    return NextResponse.json(
      {
        success: true,
        message: "Database bootstrap completed successfully",
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        seed: {
          rolesCreated: finalRoleCount,
          permissionsCreated: finalPermissionCount,
          superAdminsCreated: superAdminCount,
          verifiedBy: ["Role Count", "Super Admin Check"],
        },
        nextSteps: [
          "1. DELETE BOOTSTRAP_TOKEN from Render environment variables",
          "2. Log in to your app with one of the super-admin emails",
          "3. Verify admin account access and permissions",
          "4. Test all RBAC-protected features",
        ],
        executionMode: "Direct Prisma Import (Resilient)",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[BOOTSTRAP] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : JSON.stringify(error);

    return NextResponse.json(
      {
        error: "Bootstrap failed",
        message: errorMessage,
        timestamp: new Date().toISOString(),
        help: "Check Render logs for detailed error information",
      },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: NextRequest) {
  // Support GET requests for easier browser access
  return POST(request);
}
