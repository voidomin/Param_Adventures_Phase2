import { prisma } from "@/lib/db";
import nodemailer from "nodemailer";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execPromise = promisify(exec);

export class SystemService {
  /**
   * Performs connectivity diagnostics for the configured SMTP server.
   */
  static async verifySmtpConnection() {
    const host = process.env.SMTP_HOST || "smtp.zoho.in";
    const port = Number.parseInt(process.env.SMTP_PORT || "465", 10);
    const secure = (process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error("SMTP credentials not configured in environment");
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });

    await transporter.verify();
    return { host, port, secure };
  }

  /**
   * Forcefully pushes the schema to the database.
   * WARNING: Should only be used as a last resort in non-interactive environments.
   */
  static async repairSchema() {
    console.log("[SystemService] Starting schema repair via prisma db push...");
    const { stdout, stderr } = await execPromise("npx prisma db push", {
      env: process.env,
    });

    const [rolesCount, bookingsCount] = await Promise.all([
      prisma.role.count(),
      prisma.booking.count(),
    ]);

    return {
      rolesCount,
      bookingsCount,
      stdout: stdout?.slice(0, 1200),
      stderr: stderr?.slice(0, 1200),
    };
  }

  /**
   * Runs the initial database seed.
   */
  static async bootstrapDatabase() {
    const existingRoles = await prisma.role.count();
    if (existingRoles > 0) {
      throw new Error("Database already bootstrapped. Found existing roles.");
    }

    // Dynamic import to avoid issues if the seed file is missing or has env dependencies at startup
    const { main: runSeed } = await import("../../prisma/seed.mjs");
    await runSeed(prisma);

    const [finalRoleCount, finalPermissionCount, superAdminCount] = await Promise.all([
      prisma.role.count(),
      prisma.permission.count(),
      prisma.user.count({ where: { role: { name: "SUPER_ADMIN" } } }),
    ]);

    return {
      rolesCreated: finalRoleCount,
      permissionsCreated: finalPermissionCount,
      superAdminsCreated: superAdminCount,
    };
  }
}
