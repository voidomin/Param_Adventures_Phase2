import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SystemService } from "@/services/system.service";
import { authLimiter } from "@/lib/rate-limiter";

export const runtime = "nodejs";

/**
 * ONE-TIME Bootstrap Endpoint (Hardened v1.0.2)
 *
 * Security:
 * - Requires X-Bootstrap-Token HEADER (v1.0.2 upgrade - prevents URL log leaking)
 * - Rate limited to prevent brute-force (v1.0.2 upgrade)
 * - Segregated logic via SystemService
 */
export async function POST(request: NextRequest) {
  // 0. Rate Limiting Protection
  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
  const rateLimit = authLimiter.check(ip);
  if (!rateLimit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode");
    const bootstrapToken = process.env.BOOTSTRAP_TOKEN;

    // 1. Validate authorization token (HEADER BASED)
    const providedToken = request.headers.get("X-Bootstrap-Token");

    if (!bootstrapToken) {
      return NextResponse.json(
        { error: "BOOTSTRAP_TOKEN not configured in environment" },
        { status: 500 }
      );
    }

    if (!providedToken || providedToken !== bootstrapToken) {
      console.warn(`[BOOTSTRAP] Unauthorized attempt from IP: ${ip}`);
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing X-Bootstrap-Token header" },
        { status: 401 }
      );
    }

    // --- SUB-OPERATION: Schema Repair ---
    if (mode === "repair-schema") {
      const startTime = Date.now();
      const result = await SystemService.repairSchema();
      const duration = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        message: "Schema repair completed successfully",
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        diagnostics: {
          rolesCount: result.rolesCount,
          bookingsCount: result.bookingsCount,
          prismaOutput: result.stdout,
          prismaWarnings: result.stderr,
        }
      });
    }

    // --- SUB-OPERATION: SMTP Connectivity ---
    if (mode === "smtp-check") {
      const result = await SystemService.verifySmtpConnection();
      return NextResponse.json({
        success: true,
        mode: "smtp-check",
        message: "SMTP connectivity verified successfully",
        timestamp: new Date().toISOString(),
        diagnostics: result
      });
    }

    // --- MAIN OPERATION: Initial Seeding ---
    console.log("[BOOTSTRAP] Starting database seed orchestration...");
    const startTime = Date.now();
    const result = await SystemService.bootstrapDatabase();
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: "Database bootstrap completed successfully",
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      seed: result,
      executionMode: "Service-Layer Orchestration (Resilient)"
    });

  } catch (error) {
    console.error("[BOOTSTRAP] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Bootstrap operation failed",
        message: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

