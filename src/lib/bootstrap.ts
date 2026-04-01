import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function ensureBasicSettings() {
  const PLATFORM_SETTINGS = [
    { key: "email_provider", value: "RESEND", description: "ZOHO_API | ZOHO_SMTP | RESEND" },
    { key: "smtp_host", value: "smtp.zoho.in", description: "SMTP Server Host" },
    { key: "smtp_port", value: "465", description: "SMTP Port (465, 587, 25)" },
    { key: "smtp_user", value: "", description: "SMTP Username" },
    { key: "smtp_pass", value: "", description: "SMTP Password" },
    { key: "smtp_secure", value: "true", description: "Use SSL/TLS (true/false)" },
    { key: "smtp_from", value: "Param Adventures <booking@paramadventures.in>", description: "Email Sender Identity" },
    { key: "zoho_api_key", value: "", description: "Zoho ZeptoMail API Key" },
    { key: "resend_api_key", value: process.env.RESEND_API_KEY || "", description: "Resend.com API Key" },
    { key: "media_provider", value: "CLOUDINARY", description: "CLOUDINARY | AWS_S3" },
    { key: "maintenance_mode", value: "false", description: "Site-wide kill switch (true/false)" },
    { key: "app_url", value: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000", description: "Base domain for sitemaps and SEO" },
    { key: "jwt_expiry", value: "1h", description: "Access token duration" },
    { key: "refresh_token_expiry", value: "7d", description: "Refresh token duration" },
    { key: "razorpay_mode", value: "TEST", description: "TEST | LIVE" },
  ];

  const SITE_SETTINGS = [
    { key: "site_title", value: "Param Adventures" },
    { key: "site_description", value: "Curated outdoor experiences across India" },
    { key: "company_name", value: "Param Adventures Private Limited" },
  ];

  console.log("[BOOTSTRAP] Checking platform settings...");
  for (const s of PLATFORM_SETTINGS) {
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  console.log("[BOOTSTRAP] Checking site settings...");
  for (const s of SITE_SETTINGS) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
}

export async function ensureRoles() {
  const ROLES = ["REGISTERED_USER", "TREK_LEAD", "TRIP_MANAGER", "ADMIN", "SUPER_ADMIN"];
  
  console.log("[BOOTSTRAP] Checking roles...");
  for (const roleName of ROLES) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, description: `System ${roleName} role`, isSystem: true },
    });
  }
}

/**
 * Emergency Recovery:
 * If the provided token matches BOOTSTRAP_TOKEN, we reset the user's password
 * and grant them SUPER_ADMIN access.
 */
export async function emergencyAdminRecovery(email: string, password: string, token: string) {
  const bootstrapToken = process.env.BOOTSTRAP_TOKEN;
  if (!bootstrapToken || token !== bootstrapToken) return null;

  console.log(`[BOOTSTRAP] Emergency recovery triggered for ${email}`);

  const superAdminRole = await prisma.role.findUnique({
    where: { name: "SUPER_ADMIN" },
  });
  if (!superAdminRole) throw new Error("SUPER_ADMIN role missing");

  const hashedPassword = await hashPassword(password);

  return await prisma.user.upsert({
    where: { email: email.toLowerCase().trim() },
    update: {
      password: hashedPassword,
      roleId: superAdminRole.id,
      status: "ACTIVE",
      isVerified: true,
    },
    create: {
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: "Admin Bootstrapper",
      roleId: superAdminRole.id,
      status: "ACTIVE",
      isVerified: true,
      phoneNumber: "+91-0000000000",
    },
    include: { role: true },
  });
}
